import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateEditorPreferences } from "@/actions/editor-preferences";

// EditorPreferencesError can't come from a real import of @/lib/db/editor-preferences
// here — that module imports @/lib/prisma at the top level, which throws in this test
// environment (no DATABASE_URL). Define an equivalent class instead: since the whole
// module is mocked below to export *this* class, the action's `instanceof` check still
// sees the same reference as the one thrown in these tests.
const { authMock, updateEditorPreferencesInDbMock, EditorPreferencesError } = vi.hoisted(() => {
  class EditorPreferencesError extends Error {}
  return {
    authMock: vi.fn(),
    updateEditorPreferencesInDbMock: vi.fn(),
    EditorPreferencesError,
  };
});

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db/editor-preferences", () => ({
  EditorPreferencesError,
  updateEditorPreferences: updateEditorPreferencesInDbMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateEditorPreferences action", () => {
  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const result = await updateEditorPreferences({ theme: "monokai" });

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(updateEditorPreferencesInDbMock).not.toHaveBeenCalled();
  });

  it("returns the saved preferences on success", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    const saved = { fontSize: 16, tabSize: 4, wordWrap: false, minimap: true, theme: "monokai" as const };
    updateEditorPreferencesInDbMock.mockResolvedValue(saved);

    const result = await updateEditorPreferences({ theme: "monokai" });

    expect(result).toEqual({ success: true, data: saved });
    expect(updateEditorPreferencesInDbMock).toHaveBeenCalledWith({ theme: "monokai" });
  });

  it("surfaces an EditorPreferencesError message to the client", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    updateEditorPreferencesInDbMock.mockRejectedValue(new EditorPreferencesError("Invalid font size"));

    const result = await updateEditorPreferences({ fontSize: 999 as never });

    expect(result).toEqual({ success: false, error: "Invalid font size" });
  });

  it("replaces an unknown/internal error with a generic message and logs it", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    updateEditorPreferencesInDbMock.mockRejectedValue(
      new Error("Invalid `prisma.user.updateMany()` invocation: ...")
    );

    const result = await updateEditorPreferences({ theme: "monokai" });

    expect(result).toEqual({ success: false, error: "Failed to save preferences" });
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });

  it("replaces a plain Error even when its message happens to match a known-safe string, proving the check is instanceof, not string content", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    updateEditorPreferencesInDbMock.mockRejectedValue(new Error("Account not found"));

    const result = await updateEditorPreferences({ theme: "monokai" });

    expect(result).toEqual({ success: false, error: "Failed to save preferences" });
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });

  it("returns a result instead of throwing when auth() itself rejects, and logs it like any other unknown error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockRejectedValue(new Error("session decrypt failed"));

    const result = await updateEditorPreferences({ theme: "monokai" });

    expect(result).toEqual({ success: false, error: "Failed to save preferences" });
    expect(updateEditorPreferencesInDbMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});
