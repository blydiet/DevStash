"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getAuthErrorMessage } from "@/lib/auth-error-messages";

const AUTH_ERROR_TOAST_ID = "auth-error";

// Auth.js redirects here with ?error=<code> on an OAuth failure (e.g.
// GitHub returning an email already registered via credentials) rather than
// through a Server Action, so there's no other seam to surface the message
// from. Must be rendered inside a <Suspense> boundary — useSearchParams()
// requires one.
export function AuthErrorToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (!error) return;

    // Fixed id so React Strict Mode's dev-only double effect invocation
    // replaces the toast instead of stacking two, matching
    // EditorPreferencesContext.tsx's SAVE_TOAST_ID pattern.
    toast.error(getAuthErrorMessage(error), { id: AUTH_ERROR_TOAST_ID });

    const params = new URLSearchParams(searchParams);
    params.delete("error");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    // Only re-run if the error code itself changes; router/pathname/searchParams
    // are stable enough here that including them would just re-fire this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return null;
}
