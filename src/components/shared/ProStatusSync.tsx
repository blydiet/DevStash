"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * The refetch this depends on isn't owned by this file: SessionProvider
 * (see layout.tsx) is configured with its default refetchOnWindowFocus
 * (refetches on tab focus/visibility) plus an explicit refetchInterval
 * (5min poll backstop, for a tab that's never blurred/refocused) — both
 * re-run the jwt callback server-side, which re-syncs isPro from the DB.
 * If either gets disabled later, this component silently stops catching
 * downgrades promptly (no error — it just stops seeing the input change).
 * This just watches for a Pro -> free transition in whatever session data
 * arrives and surfaces it, since the refetch itself is otherwise silent.
 */
export function ProStatusSync() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const previousIsProRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    // Signing out isn't a subscription change — reset so a later sign-in
    // (possibly as a different user) starts its own tracking from scratch.
    if (status !== "authenticated") {
      previousIsProRef.current = null;
      return;
    }

    const isPro = session?.user?.isPro;
    const previous = previousIsProRef.current;

    // A malformed/incomplete session payload (isPro missing rather than an
    // explicit boolean) isn't confirmation of anything — skip it rather than
    // treating it as "not Pro" or clobbering the last known good value.
    if (typeof isPro !== "boolean") return;

    if (previous === true && isPro === false) {
      toast.error("Your Pro subscription has ended.");
      router.refresh();
    }

    previousIsProRef.current = isPro;
  }, [session, status, router]);

  return null;
}
