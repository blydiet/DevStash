import { auth } from "@/auth";

interface SessionUser {
  userId: string;
  isPro: boolean;
}

// Shared by every Server Action that needs "a signed-in user, or bail with
// the standard Not-authenticated result" — several client components already
// treat `err.message === "Not authenticated"` as a load-bearing contract
// (e.g. /settings, /upgrade, /favorites redirecting on it), so this is the
// one place that string lives now instead of being copy-pasted per action.
export async function requireSession(): Promise<
  { ok: true; user: SessionUser } | { ok: false; result: { success: false; error: string } }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ok: false, result: { success: false, error: "Not authenticated" } };
  }

  return { ok: true, user: { userId: session.user.id, isPro: session.user.isPro } };
}
