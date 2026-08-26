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
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
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
        },
      };
    },
  },
});
