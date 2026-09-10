import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUserId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  return session.user.id;
}

export interface CurrentUser {
  name: string;
  email: string;
  image: string | null;
  isPro: boolean;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  return {
    name: session.user.name ?? session.user.email ?? "User",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
    isPro: session.user.isPro,
  };
}

// Shared by every DashboardShell page to resolve the boolean the item
// drawer's AI Explain gating needs. Handles its own failure end-to-end
// (logs, then redirects to sign-in) rather than rethrowing, so it must be
// called standalone — a bare top-level `await`, never nested inside a
// page's own try/catch or combined into a Promise.all/allSettled alongside
// another fetch. Next's redirect() throws a special digest-tagged error
// that a generic catch block doesn't recognize and would swallow into a
// "just show hasError" state instead of letting it propagate, and
// Promise.allSettled would capture it as an inert `{status:"rejected"}`
// entry instead of ever reaching Next's render pipeline at all — either way
// the redirect would silently never happen. Calling this on its own line
// keeps the throw a clean, uncaught path straight up to Next.
export async function getDashboardIsPro(callbackUrl: string): Promise<boolean> {
  try {
    return (await getCurrentUser()).isPro;
  } catch (err) {
    // Next tags its own control-flow throws (DYNAMIC_SERVER_USAGE from
    // auth()'s headers()/cookies() read during a static-generation attempt,
    // a nested NEXT_REDIRECT, NEXT_NOT_FOUND, etc.) with a `digest` string —
    // confirmed live via `npm run build`, which surfaced auth()'s
    // DYNAMIC_SERVER_USAGE landing right here. Those must propagate
    // untouched so Next's own machinery can act on them (e.g. bail this
    // route to dynamic rendering); only a genuine, non-framework failure
    // should be logged and turned into our own redirect.
    if (err && typeof err === "object" && "digest" in err && typeof err.digest === "string") {
      throw err;
    }
    console.error("Failed to resolve current user for isPro:", err);
    // Unlike every existing hardcoded `callbackUrl=/settings`-style
    // redirect in this codebase, this callbackUrl is caller-supplied and
    // can carry its own dynamic segment (e.g. `/items/${type}`) — encode it
    // so a value containing `&`/`=`/etc. can't be misread as additional
    // /sign-in query params instead of staying nested inside callbackUrl.
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
}

export interface ProfileUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: Date;
  hasPassword: boolean;
  authProvider: "github" | "credentials";
}

export async function getProfileUser(): Promise<ProfileUser> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      password: true,
      accounts: { select: { provider: true } },
    },
  });

  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    image: user.image,
    createdAt: user.createdAt,
    hasPassword: user.password !== null,
    authProvider: user.accounts.some((account) => account.provider === "github")
      ? "github"
      : "credentials",
  };
}
