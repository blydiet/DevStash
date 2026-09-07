import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { credentialsSchema } from "@/lib/validations/auth";
import { isEmailVerificationEnabled } from "@/lib/feature-flags";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export class EmailNotVerifiedError extends CredentialsSignin {
  code = "email-not-verified";
}

export class GitHubOnlyAccountError extends CredentialsSignin {
  code = "github-only-account";
}

export class RateLimitedError extends CredentialsSignin {
  code = "rate-limited";
  reset: number;

  constructor(reset: number) {
    super();
    this.reset = reset;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    GitHub,
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (rawCredentials) => {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const ip = await getClientIp();
        const { success: withinLimit, reset } = await checkRateLimit(
          "sign-in",
          `${ip}:${email}`
        );

        if (!withinLimit) {
          throw new RateLimitedError(reset);
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          return null;
        }

        if (!user.password) {
          throw new GitHubOnlyAccountError();
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
          return null;
        }

        if (isEmailVerificationEnabled() && !user.emailVerified) {
          throw new EmailNotVerifiedError();
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      // Re-sync on every call (not just sign-in) so a Stripe webhook's isPro
      // update is picked up on the user's next request, not just next login —
      // see docs/stripe-integration-plan.md. This callback runs on every
      // auth() call, so a DB failure here must not throw and break session
      // validation sitewide — fall back to the token's last known value.
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { isPro: true },
          });
          token.isPro = dbUser?.isPro ?? false;
        } catch (err) {
          console.error("Failed to refresh isPro status:", err);
          token.isPro = token.isPro ?? false;
        }
      }

      return token;
    },
    session({ session, token }) {
      return {
        expires: session.expires,
        user: {
          id: token.id,
          name: token.name ?? null,
          email: token.email ?? "",
          image: token.picture ?? null,
          isPro: token.isPro ?? false,
        },
      };
    },
  },
});
