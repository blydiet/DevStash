import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateItem } from "@/actions/items";

const { authMock, updateItemInDbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  updateItemInDbMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db/items", () => ({
  updateItem: updateItemInDbMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const validData = {
  title: "Updated title",
  description: null,
  content: null,
  url: null,
  language: null,
  tags: ["react"],
};

describe("updateItem", () => {
  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const result = await updateItem("item-1", validData);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(updateItemInDbMock).not.toHaveBeenCalled();
  });

  it("rejects an empty title via schema validation before touching the DB", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    const result = await updateItem("item-1", { ...validData, title: "  " });

    expect(result.success).toBe(false);
    expect(updateItemInDbMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid URL via schema validation", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    const result = await updateItem("item-1", { ...validData, url: "not-a-url" });

    expect(result.success).toBe(false);
    expect(updateItemInDbMock).not.toHaveBeenCalled();
  });

  it("reports item-not-found when the query function returns null (wrong owner or missing)", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    updateItemInDbMock.mockResolvedValue(null);

    const result = await updateItem("item-1", validData);

    expect(result).toEqual({ success: false, error: "Item not found" });
  });

  it("returns the updated item on success", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    const updated = { id: "item-1", title: "Updated title" };
    updateItemInDbMock.mockResolvedValue(updated);

    const result = await updateItem("item-1", validData);

    expect(updateItemInDbMock).toHaveBeenCalledWith("item-1", validData);
    expect(result).toEqual({ success: true, data: updated });
  });
});
