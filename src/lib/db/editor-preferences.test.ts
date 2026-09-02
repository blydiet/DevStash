import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EditorPreferencesError,
  getEditorPreferences,
  updateEditorPreferences,
} from "@/lib/db/editor-preferences";
import { DEFAULT_EDITOR_PREFERENCES } from "@/lib/editor-preferences";

const { getCurrentUserIdMock, prismaMock } = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/user", () => ({
  getCurrentUserId: getCurrentUserIdMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const stored = {
  fontSize: 16,
  tabSize: 4,
  wordWrap: false,
  minimap: true,
  theme: "monokai" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserIdMock.mockResolvedValue("user-1");
});

describe("getEditorPreferences", () => {
  it("returns defaults when the user has never saved preferences (null column)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ editorPreferences: null });

    await expect(getEditorPreferences()).resolves.toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("returns the parsed stored preferences when valid", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ editorPreferences: stored });

    await expect(getEditorPreferences()).resolves.toEqual(stored);
  });

  it("falls back to defaults and logs a warning when the stored value is unparseable", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    prismaMock.user.findUnique.mockResolvedValue({ editorPreferences: { fontSize: 999 } });

    await expect(getEditorPreferences()).resolves.toEqual(DEFAULT_EDITOR_PREFERENCES);
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it("does not log a warning for the common null (never-set) case", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    prismaMock.user.findUnique.mockResolvedValue({ editorPreferences: null });

    await getEditorPreferences();

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("throws EditorPreferencesError when the session's user row no longer exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(getEditorPreferences()).rejects.toThrow(EditorPreferencesError);
    await expect(getEditorPreferences()).rejects.toThrow("Account not found");
  });

  it("propagates a session failure from getCurrentUserId", async () => {
    getCurrentUserIdMock.mockRejectedValue(new Error("Not authenticated"));

    await expect(getEditorPreferences()).rejects.toThrow("Not authenticated");
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("updateEditorPreferences", () => {
  it("rejects an invalid partial update without touching the database", async () => {
    await expect(updateEditorPreferences({ fontSize: 999 })).rejects.toThrow(EditorPreferencesError);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it("merges a single changed field onto the currently stored preferences", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ editorPreferences: stored });
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateEditorPreferences({ theme: "github-dark" });

    expect(result).toEqual({ ...stored, theme: "github-dark" });
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { editorPreferences: { ...stored, theme: "github-dark" } },
    });
  });

  it("strips unknown keys before writing, not just before validating", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ editorPreferences: stored });
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateEditorPreferences({ theme: "github-dark", malicious: "x" });

    expect(result).toEqual({ ...stored, theme: "github-dark" });
    expect("malicious" in result).toBe(false);
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { editorPreferences: { ...stored, theme: "github-dark" } },
    });
  });

  it("merges onto defaults when nothing has been stored yet", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ editorPreferences: null });
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateEditorPreferences({ wordWrap: false });

    expect(result).toEqual({ ...DEFAULT_EDITOR_PREFERENCES, wordWrap: false });
  });

  it("ignores an explicit undefined value rather than overwriting the stored field", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ editorPreferences: stored });
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateEditorPreferences({ theme: undefined, minimap: false });

    expect(result).toEqual({ ...stored, minimap: false });
    expect(result.theme).toBe(stored.theme);
  });

  it("throws EditorPreferencesError when the user row is gone before the update", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(updateEditorPreferences({ theme: "monokai" })).rejects.toThrow("Account not found");
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it("throws EditorPreferencesError when updateMany matches no row (deleted mid-request)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ editorPreferences: stored });
    prismaMock.user.updateMany.mockResolvedValue({ count: 0 });

    await expect(updateEditorPreferences({ theme: "monokai" })).rejects.toThrow("Account not found");
  });

  it("propagates a session failure from getCurrentUserId", async () => {
    getCurrentUserIdMock.mockRejectedValue(new Error("Not authenticated"));

    await expect(updateEditorPreferences({ theme: "monokai" })).rejects.toThrow("Not authenticated");
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});
