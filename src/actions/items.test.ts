import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createItem,
  deleteItem,
  toggleItemFavorite,
  toggleItemPin,
  updateItem,
} from "@/actions/items";

const {
  authMock,
  createItemInDbMock,
  getItemTypeByNameMock,
  updateItemInDbMock,
  deleteItemInDbMock,
  setItemFavoriteInDbMock,
  setItemPinnedInDbMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  createItemInDbMock: vi.fn(),
  getItemTypeByNameMock: vi.fn(),
  updateItemInDbMock: vi.fn(),
  deleteItemInDbMock: vi.fn(),
  setItemFavoriteInDbMock: vi.fn(),
  setItemPinnedInDbMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db/items-mutations", () => ({
  createItem: createItemInDbMock,
  updateItem: updateItemInDbMock,
  deleteItem: deleteItemInDbMock,
  setItemFavorite: setItemFavoriteInDbMock,
  setItemPinned: setItemPinnedInDbMock,
}));

vi.mock("@/lib/db/item-metadata", () => ({
  getItemTypeByName: getItemTypeByNameMock,
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
  collectionIds: [],
};

const validCreateData = {
  type: "snippet",
  title: "New Snippet",
  description: null,
  content: "console.log('hi')",
  url: null,
  language: "typescript",
  fileUrl: null,
  fileName: null,
  fileSize: null,
  tags: ["react"],
  collectionIds: [],
};

describe("createItem", () => {
  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const result = await createItem(validCreateData);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(createItemInDbMock).not.toHaveBeenCalled();
  });

  it("rejects an empty title via schema validation before touching the DB", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    const result = await createItem({ ...validCreateData, title: "  " });

    expect(result.success).toBe(false);
    expect(createItemInDbMock).not.toHaveBeenCalled();
  });

  it("rejects a link item with no URL via schema validation", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    const result = await createItem({ ...validCreateData, type: "link", url: null });

    expect(result.success).toBe(false);
    expect(createItemInDbMock).not.toHaveBeenCalled();
  });

  it("rejects an image item with no fileUrl via schema validation", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    const result = await createItem({ ...validCreateData, type: "image", fileUrl: null });

    expect(result.success).toBe(false);
    expect(createItemInDbMock).not.toHaveBeenCalled();
  });

  it("reports an error when the type doesn't resolve to a system item type", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    getItemTypeByNameMock.mockResolvedValue(null);

    const result = await createItem(validCreateData);

    expect(result).toEqual({ success: false, error: "Invalid item type" });
    expect(createItemInDbMock).not.toHaveBeenCalled();
  });

  it("returns the created item on success", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    const type = { id: "type-snippet", name: "snippet", icon: "Code", color: "#f97316" };
    getItemTypeByNameMock.mockResolvedValue(type);
    const created = { id: "item-1", title: "New Snippet" };
    createItemInDbMock.mockResolvedValue(created);

    const result = await createItem(validCreateData);

    expect(createItemInDbMock).toHaveBeenCalledWith({ ...validCreateData, type });
    expect(result).toEqual({ success: true, data: created });
  });

  it("reports a generic failure instead of throwing when the DB layer throws", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    const type = { id: "type-snippet", name: "snippet", icon: "Code", color: "#f97316" };
    getItemTypeByNameMock.mockResolvedValue(type);
    createItemInDbMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createItem(validCreateData);

    expect(getItemTypeByNameMock).toHaveBeenCalledWith(validCreateData.type);
    expect(createItemInDbMock).toHaveBeenCalledWith({ ...validCreateData, type });
    expect(result).toEqual({ success: false, error: "Failed to create item" });
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to create item:", expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it("creates an image item that has a fileUrl", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    const type = { id: "type-image", name: "image", icon: "Image", color: "#ec4899" };
    getItemTypeByNameMock.mockResolvedValue(type);
    const created = { id: "item-1", title: "Photo" };
    createItemInDbMock.mockResolvedValue(created);

    const data = {
      ...validCreateData,
      type: "image",
      content: null,
      fileUrl: "https://public.example/user-1/abc-photo.png",
      fileName: "photo.png",
      fileSize: 1024,
    };

    const result = await createItem(data);

    expect(createItemInDbMock).toHaveBeenCalledWith({ ...data, type });
    expect(result).toEqual({ success: true, data: created });
  });
});

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

  it("reports a generic failure instead of throwing when the DB layer throws", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    updateItemInDbMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await updateItem("item-1", validData);

    expect(updateItemInDbMock).toHaveBeenCalledWith("item-1", validData);
    expect(result).toEqual({ success: false, error: "Failed to update item" });
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to update item:", expect.any(Error));

    consoleErrorSpy.mockRestore();
  });
});

describe("toggleItemFavorite", () => {
  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const result = await toggleItemFavorite("item-1", true);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(setItemFavoriteInDbMock).not.toHaveBeenCalled();
  });

  it("reports item-not-found when the query function returns null (wrong owner or missing)", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    setItemFavoriteInDbMock.mockResolvedValue(null);

    const result = await toggleItemFavorite("item-1", true);

    expect(setItemFavoriteInDbMock).toHaveBeenCalledWith("item-1", true);
    expect(result).toEqual({ success: false, error: "Item not found" });
  });

  it("returns the updated item on success", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    const updated = { id: "item-1", isFavorite: true };
    setItemFavoriteInDbMock.mockResolvedValue(updated);

    const result = await toggleItemFavorite("item-1", true);

    expect(setItemFavoriteInDbMock).toHaveBeenCalledWith("item-1", true);
    expect(result).toEqual({ success: true, data: updated });
  });

  it("reports a generic failure instead of throwing when the DB layer throws", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    setItemFavoriteInDbMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await toggleItemFavorite("item-1", true);

    expect(setItemFavoriteInDbMock).toHaveBeenCalledWith("item-1", true);
    expect(result).toEqual({ success: false, error: "Failed to update favorite" });
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to update item favorite:", expect.any(Error));

    consoleErrorSpy.mockRestore();
  });
});

describe("toggleItemPin", () => {
  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const result = await toggleItemPin("item-1", true);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(setItemPinnedInDbMock).not.toHaveBeenCalled();
  });

  it("reports item-not-found when the query function returns null (wrong owner or missing)", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    setItemPinnedInDbMock.mockResolvedValue(null);

    const result = await toggleItemPin("item-1", true);

    expect(setItemPinnedInDbMock).toHaveBeenCalledWith("item-1", true);
    expect(result).toEqual({ success: false, error: "Item not found" });
  });

  it("returns the updated item on success", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    const updated = { id: "item-1", isPinned: true };
    setItemPinnedInDbMock.mockResolvedValue(updated);

    const result = await toggleItemPin("item-1", true);

    expect(setItemPinnedInDbMock).toHaveBeenCalledWith("item-1", true);
    expect(result).toEqual({ success: true, data: updated });
  });

  it("reports a generic failure instead of throwing when the DB layer throws", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    setItemPinnedInDbMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await toggleItemPin("item-1", true);

    expect(setItemPinnedInDbMock).toHaveBeenCalledWith("item-1", true);
    expect(result).toEqual({ success: false, error: "Failed to update pin" });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to update item pin for item item-1:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});

describe("deleteItem", () => {
  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const result = await deleteItem("item-1");

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(deleteItemInDbMock).not.toHaveBeenCalled();
  });

  it("reports item-not-found when the query function returns false (wrong owner or missing)", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    deleteItemInDbMock.mockResolvedValue(false);

    const result = await deleteItem("item-1");

    expect(result).toEqual({ success: false, error: "Item not found" });
  });

  it("returns success when the item is deleted", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    deleteItemInDbMock.mockResolvedValue(true);

    const result = await deleteItem("item-1");

    expect(deleteItemInDbMock).toHaveBeenCalledWith("item-1");
    expect(result).toEqual({ success: true });
  });

  it("reports a generic failure instead of throwing when the DB layer throws", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    deleteItemInDbMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await deleteItem("item-1");

    expect(deleteItemInDbMock).toHaveBeenCalledWith("item-1");
    expect(result).toEqual({ success: false, error: "Failed to delete item" });
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to delete item:", expect.any(Error));

    consoleErrorSpy.mockRestore();
  });
});
