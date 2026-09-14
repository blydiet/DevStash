import { describe, expect, it, vi, beforeEach } from "vitest";
import type { useRouter } from "next/navigation";
import { toast } from "sonner";
import { handleAiActionResult } from "@/lib/ai-result-toast";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

function makeRouter() {
  return { push: vi.fn() } as unknown as ReturnType<typeof useRouter>;
}

describe("handleAiActionResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns data on success and shows no toast", () => {
    const router = makeRouter();
    const result = handleAiActionResult(
      { success: true, data: { tags: ["a"] } },
      router,
      "fallback"
    );

    expect(result).toEqual({ tags: ["a"] });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("returns a falsy-but-defined data payload rather than treating it as failure", () => {
    const router = makeRouter();
    const result = handleAiActionResult({ success: true, data: "" }, router, "fallback");

    expect(result).toBe("");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows the fallback message when success is false and no error is set", () => {
    const router = makeRouter();
    const result = handleAiActionResult({ success: false }, router, "fallback");

    expect(result).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith("fallback", { action: undefined });
  });

  it("shows the server-provided error message when present", () => {
    const router = makeRouter();
    handleAiActionResult({ success: false, error: "Rate limited" }, router, "fallback");

    expect(toast.error).toHaveBeenCalledWith("Rate limited", { action: undefined });
  });

  it("treats a failure as a failure even when data is present", () => {
    const router = makeRouter();
    const result = handleAiActionResult(
      { success: false, error: "Rate limited", data: { tags: ["a"] } },
      router,
      "fallback"
    );

    expect(result).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith("Rate limited", { action: undefined });
  });

  it("falls back to fallbackMessage when error is an empty string", () => {
    const router = makeRouter();
    handleAiActionResult({ success: false, error: "" }, router, "fallback");

    expect(toast.error).toHaveBeenCalledWith("fallback", { action: undefined });
  });

  it("treats success:true with data undefined as a failure", () => {
    const router = makeRouter();
    const result = handleAiActionResult({ success: true }, router, "fallback");

    expect(result).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith("fallback", { action: undefined });
  });

  it("wires an Upgrade action to /upgrade?feature=ai when upgradeRequired is true", () => {
    const router = makeRouter();
    handleAiActionResult(
      { success: false, error: "Upgrade to Pro", upgradeRequired: true },
      router,
      "fallback"
    );

    const call = vi.mocked(toast.error).mock.calls[0];
    const options = call[1] as { action?: { label: string; onClick: () => void } };
    expect(options.action).toEqual({ label: "Upgrade", onClick: expect.any(Function) });

    options.action?.onClick();
    expect(router.push).toHaveBeenCalledWith("/upgrade?feature=ai");
  });

  it("omits the action when upgradeRequired is false", () => {
    const router = makeRouter();
    handleAiActionResult(
      { success: false, error: "Rate limited", upgradeRequired: false },
      router,
      "fallback"
    );

    expect(toast.error).toHaveBeenCalledWith("Rate limited", { action: undefined });
  });
});
