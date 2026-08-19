import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteItem,
  getItemDetail,
  getItemTypeByName,
  getItemTypes,
  getPinnedItems,
  updateItem,
} from "@/lib/db/items";

const { getCurrentUserIdMock, prismaMock, txMock } = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  txMock: {
    item: { update: vi.fn() },
    itemTag: { deleteMany: vi.fn(), create: vi.fn() },
    tag: { upsert: vi.fn() },
  },
  prismaMock: {
    item: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    itemType: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db/user", () => ({
  getCurrentUserId: getCurrentUserIdMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserIdMock.mockResolvedValue("user-1");
  prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof txMock) => unknown) =>
    cb(txMock)
  );
});

describe("getPinnedItems", () => {
  it("flattens the type relation and joined tags into ItemSummary", async () => {
    prismaMock.item.findMany.mockResolvedValue([
      {
        id: "item-1",
        title: "useDebounce Hook",
        description: null,
        isFavorite: true,
        isPinned: true,
        createdAt: new Date("2026-01-01"),
        type: { id: "type-snippet", name: "snippet", icon: "Code", color: "#f97316" },
        tags: [{ tag: { name: "react" } }, { tag: { name: "hooks" } }],
      },
    ]);

    const [result] = await getPinnedItems();

    expect(result.tags).toEqual(["react", "hooks"]);
    expect(result.type.name).toBe("snippet");
  });
});

describe("getItemDetail", () => {
  it("scopes the lookup to the current user and flattens joined tags", async () => {
    prismaMock.item.findFirst.mockResolvedValue({
      id: "item-1",
      title: "useDebounce Hook",
      description: "Custom hook",
      contentType: "text",
      content: "export function useDebounce() {}",
      fileUrl: null,
      fileName: null,
      fileSize: null,
      url: null,
      language: "typescript",
      isFavorite: true,
      isPinned: false,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
      type: { id: "type-snippet", name: "snippet", icon: "Code", color: "#f97316" },
      tags: [{ tag: { name: "react" } }],
      collection: { id: "col-1", name: "React Patterns" },
    });

    const result = await getItemDetail("item-1");

    expect(prismaMock.item.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", userId: "user-1" } })
    );
    expect(result?.tags).toEqual(["react"]);
    expect(result?.collection).toEqual({ id: "col-1", name: "React Patterns" });
  });

  it("returns null when no item matches (not found, or belongs to another user)", async () => {
    prismaMock.item.findFirst.mockResolvedValue(null);
    await expect(getItemDetail("item-1")).resolves.toBeNull();
  });
});

describe("getItemTypeByName", () => {
  it("returns null when no system type matches", async () => {
    prismaMock.itemType.findFirst.mockResolvedValue(null);
    await expect(getItemTypeByName("bogus-type")).resolves.toBeNull();
  });

  it("returns the mapped type when found", async () => {
    prismaMock.itemType.findFirst.mockResolvedValue({
      id: "type-note",
      name: "note",
      icon: "StickyNote",
      color: "#22c55e",
    });

    await expect(getItemTypeByName("note")).resolves.toEqual({
      id: "type-note",
      name: "note",
      icon: "StickyNote",
      color: "#22c55e",
    });
  });
});

describe("getItemTypes", () => {
  it("sorts types into the fixed display order regardless of DB order", async () => {
    prismaMock.itemType.findMany.mockResolvedValue([
      { id: "t-link", name: "link", icon: null, color: null, _count: { items: 1 } },
      { id: "t-snippet", name: "snippet", icon: null, color: null, _count: { items: 4 } },
      { id: "t-note", name: "note", icon: null, color: null, _count: { items: 2 } },
    ]);

    const result = await getItemTypes();

    expect(result.map((t) => t.name)).toEqual(["snippet", "note", "link"]);
    expect(result.map((t) => t.itemCount)).toEqual([4, 2, 1]);
  });
});

describe("updateItem", () => {
  const input = {
    title: "Updated title",
    description: null,
    content: null,
    url: null,
    language: null,
    tags: ["react", "hooks"],
  };

  it("returns null without writing when the item isn't owned by the current user", async () => {
    prismaMock.item.findFirst.mockResolvedValueOnce(null);

    await expect(updateItem("item-1", input)).resolves.toBeNull();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("replaces tags and returns the refreshed detail on success", async () => {
    prismaMock.item.findFirst
      .mockResolvedValueOnce({ id: "item-1" }) // ownership check
      .mockResolvedValueOnce({
        // final getItemDetail refresh
        id: "item-1",
        title: "Updated title",
        description: null,
        contentType: "text",
        content: null,
        fileUrl: null,
        fileName: null,
        fileSize: null,
        url: null,
        language: null,
        isFavorite: false,
        isPinned: false,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        type: { id: "type-snippet", name: "snippet", icon: "Code", color: "#f97316" },
        tags: [{ tag: { name: "react" } }, { tag: { name: "hooks" } }],
        collection: null,
      });
    txMock.tag.upsert
      .mockResolvedValueOnce({ id: "tag-react" })
      .mockResolvedValueOnce({ id: "tag-hooks" });

    const result = await updateItem("item-1", input);

    expect(txMock.item.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: {
        title: "Updated title",
        description: null,
        content: null,
        url: null,
        language: null,
      },
    });
    expect(txMock.itemTag.deleteMany).toHaveBeenCalledWith({ where: { itemId: "item-1" } });
    expect(txMock.tag.upsert).toHaveBeenCalledWith({
      where: { userId_name: { userId: "user-1", name: "react" } },
      update: {},
      create: { userId: "user-1", name: "react" },
    });
    expect(txMock.itemTag.create).toHaveBeenCalledWith({
      data: { itemId: "item-1", tagId: "tag-react" },
    });
    expect(result?.tags).toEqual(["react", "hooks"]);
  });
});

describe("deleteItem", () => {
  it("returns false when the item isn't owned by the current user (or doesn't exist)", async () => {
    prismaMock.item.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteItem("item-1")).resolves.toBe(false);
    expect(prismaMock.item.deleteMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
    });
  });

  it("returns true when the item is deleted", async () => {
    prismaMock.item.deleteMany.mockResolvedValue({ count: 1 });

    await expect(deleteItem("item-1")).resolves.toBe(true);
  });
});
