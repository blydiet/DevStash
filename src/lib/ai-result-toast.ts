import type { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AiActionResultLike<T> {
  success: boolean;
  data?: T;
  error?: string;
  upgradeRequired?: boolean;
}

// Shared by every client-side AI action handler (Suggest tags, Summarize
// description) that calls a Server Action sharing the {success, data?,
// error?, upgradeRequired?} shape common to src/types/ai.ts — surfaces a
// failed/empty result as a toast, wiring an "Upgrade" action to
// /upgrade?feature=ai when the failure was specifically the Pro-gate
// rejection. Returns the successful payload, or undefined after already
// showing the toast, so callers can collapse their own
// `if (!result.success || result.data === undefined) { toast...; return; }`
// block to one call.
//
// Checks `result.data === undefined` rather than `!result.data` — every
// current AI action's payload is an object, but a truthiness check would
// misreport a legitimately falsy primitive payload (0, "", false) as a
// failure the moment one is added. Uses `||` (not `??`) for the fallback
// message so a server action returning `error: ""` still shows
// fallbackMessage instead of a blank toast.
export function handleAiActionResult<T>(
  result: AiActionResultLike<T>,
  router: ReturnType<typeof useRouter>,
  fallbackMessage: string
): T | undefined {
  if (!result.success || result.data === undefined) {
    toast.error(result.error || fallbackMessage, {
      action: result.upgradeRequired
        ? { label: "Upgrade", onClick: () => router.push("/upgrade?feature=ai") }
        : undefined,
    });
    return undefined;
  }

  return result.data;
}
