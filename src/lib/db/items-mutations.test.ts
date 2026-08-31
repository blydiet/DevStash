import { beforeEach, describe, expect, it, vi } from "vitest";
import { createItem, deleteItem, updateItem } from "@/lib/db/items-mutations";

const { getCurrentUserIdMock, prismaMock, txMock } = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  txMock: {
    item: { create: vi.fn(), update: vi.fn() },
    itemTag: { deleteMany: vi.fn(), create: vi.fn() },
    tag: { upsert: vi.fn() },
    itemCollection: { deleteMany: vi.fn(), createMany: vi.fn() },
    collection: { findMany: vi.fn() },
  },
  prismaMock: {
    item: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const { deleteFromR2Mock, extractKeyFromUrlMock } = vi.hoisted(() => ({
  deleteFromR2Mock: vi.fn(),
  extractKeyFromUrlMock: vi.fn((url: string) => url.replace("https://public.example/", "")),
}));

vi.mock("@/lib/db/user", () => ({
  getCurrentUserId: getCurrentUserIdMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/r2", () => ({
  deleteFromR2: deleteFromR2Mock,
  extractKeyFromUrl: extractKeyFromUrlMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserIdMock.mockResolvedValue("user-1");
  prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof txMock) => unknown) =>
    cb(txMock)
  );
});

describe("updateItem", () => {
  const input = {
    title: "Updated title",
    description: null,
    content: null,
    url: null,
    language: null,
    tags: ["react", "hooks"],
    collectionIds: [] as string[],
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
        collections: [],
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
    expect(txMock.itemCollection.deleteMany).toHaveBeenCalledWith({ where: { itemId: "item-1" } });
    expect(txMock.collection.findMany).not.toHaveBeenCalled();
    expect(txMock.itemCollection.createMany).not.toHaveBeenCalled();
  });

  it("replaces collections, filtering out any ids not owned by the current user", async () => {
    prismaMock.item.findFirst
      .mockResolvedValueOnce({ id: "item-1" })
      .mockResolvedValueOnce({
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
        tags: [],
        collections: [{ collection: { id: "col-1", name: "React Patterns" } }],
      });
    // Only col-1 belongs to the current user — col-2 (someone else's) is filtered out.
    txMock.collection.findMany.mockResolvedValueOnce([{ id: "col-1" }]);

    const result = await updateItem("item-1", {
      ...input,
      tags: [],
      collectionIds: ["col-1", "col-2"],
    });

    expect(txMock.collection.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["col-1", "col-2"] }, userId: "user-1" },
      select: { id: true },
    });
    expect(txMock.itemCollection.createMany).toHaveBeenCalledWith({
      data: [{ itemId: "item-1", collectionId: "col-1" }],
    });
    expect(result?.collections).toEqual([{ id: "col-1", name: "React Patterns" }]);
  });
});

describe("createItem", () => {
  const type = { id: "type-snippet", name: "snippet", icon: "Code", color: "#f97316" };
  const input = {
    type,
    title: "New Snippet",
    description: null,
    content: "console.log('hi')",
    url: null,
    language: "typescript",
    fileUrl: null,
    fileName: null,
    fileSize: null,
    tags: ["react", "hooks"],
    collectionIds: [] as string[],
  };
  const createdRow = {
    id: "item-1",
    title: "New Snippet",
    description: null,
    contentType: "text",
    content: "console.log('hi')",
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    language: "typescript",
    isFavorite: false,
    isPinned: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  it("creates the item and tags within a transaction, returning the built ItemDetail", async () => {
    txMock.item.create.mockResolvedValue(createdRow);
    txMock.tag.upsert
      .mockResolvedValueOnce({ id: "tag-react" })
      .mockResolvedValueOnce({ id: "tag-hooks" });

    const result = await createItem(input);

    expect(txMock.item.create).toHaveBeenCalledWith({
      data: {
        title: "New Snippet",
        description: null,
        content: "console.log('hi')",
        url: null,
        language: "typescript",
        fileUrl: null,
        fileName: null,
        fileSize: null,
        contentType: "text",
        userId: "user-1",
        typeId: "type-snippet",
      },
    });
    expect(txMock.tag.upsert).toHaveBeenCalledWith({
      where: { userId_name: { userId: "user-1", name: "react" } },
      update: {},
      create: { userId: "user-1", name: "react" },
    });
    expect(txMock.itemTag.create).toHaveBeenCalledWith({
      data: { itemId: "item-1", tagId: "tag-react" },
    });
    expect(result).toEqual({ ...createdRow, type, tags: ["react", "hooks"], collections: [] });
    expect(txMock.collection.findMany).not.toHaveBeenCalled();
    expect(txMock.itemCollection.createMany).not.toHaveBeenCalled();
  });

  it("creates the item with no tags when none are given", async () => {
    txMock.item.create.mockResolvedValue(createdRow);

    const result = await createItem({ ...input, tags: [] });

    expect(txMock.tag.upsert).not.toHaveBeenCalled();
    expect(txMock.itemTag.create).not.toHaveBeenCalled();
    expect(result.tags).toEqual([]);
  });

  it("links the item to only the collections owned by the current user", async () => {
    txMock.item.create.mockResolvedValue(createdRow);
    // Only col-1 belongs to the current user — col-2 (someone else's) is filtered out.
    txMock.collection.findMany
      .mockResolvedValueOnce([{ id: "col-1" }])
      .mockResolvedValueOnce([{ id: "col-1", name: "React Patterns" }]);

    const result = await createItem({ ...input, tags: [], collectionIds: ["col-1", "col-2"] });

    expect(txMock.collection.findMany).toHaveBeenNthCalledWith(1, {
      where: { id: { in: ["col-1", "col-2"] }, userId: "user-1" },
      select: { id: true },
    });
    expect(txMock.itemCollection.createMany).toHaveBeenCalledWith({
      data: [{ itemId: "item-1", collectionId: "col-1" }],
    });
    expect(result.collections).toEqual([{ id: "col-1", name: "React Patterns" }]);
  });

  it("sets contentType to file and stores file fields when a fileUrl is given", async () => {
    const fileType = { id: "type-image", name: "image", icon: "Image", color: "#ec4899" };
    txMock.item.create.mockResolvedValue({
      ...createdRow,
      content: null,
      contentType: "file",
      fileUrl: "https://public.example/user-1/abc-photo.png",
      fileName: "photo.png",
      fileSize: 1024,
    });

    await createItem({
      ...input,
      type: fileType,
      content: null,
      fileUrl: "https://public.example/user-1/abc-photo.png",
      fileName: "photo.png",
      fileSize: 1024,
      tags: [],
    });

    expect(txMock.item.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contentType: "file",
        fileUrl: "https://public.example/user-1/abc-photo.png",
        fileName: "photo.png",
        fileSize: 1024,
      }),
    });
  });
});

describe("deleteItem", () => {
  it("returns false when the item isn't owned by the current user (or doesn't exist)", async () => {
    prismaMock.item.findFirst.mockResolvedValue(null);
    prismaMock.item.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteItem("item-1")).resolves.toBe(false);
    expect(prismaMock.item.deleteMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
    });
    expect(deleteFromR2Mock).not.toHaveBeenCalled();
  });

  it("returns true when the item is deleted, with no R2 cleanup for a text item", async () => {
    prismaMock.item.findFirst.mockResolvedValue({ fileUrl: null });
    prismaMock.item.deleteMany.mockResolvedValue({ count: 1 });

    await expect(deleteItem("item-1")).resolves.toBe(true);
    expect(deleteFromR2Mock).not.toHaveBeenCalled();
  });

  it("deletes the R2 object when a file item is deleted", async () => {
    prismaMock.item.findFirst.mockResolvedValue({
      fileUrl: "https://public.example/user-1/abc-photo.png",
    });
    prismaMock.item.deleteMany.mockResolvedValue({ count: 1 });

    await expect(deleteItem("item-1")).resolves.toBe(true);
    expect(extractKeyFromUrlMock).toHaveBeenCalledWith(
      "https://public.example/user-1/abc-photo.png"
    );
    expect(deleteFromR2Mock).toHaveBeenCalledWith("user-1/abc-photo.png");
  });

  it("still returns true (and logs) when R2 cleanup fails after the DB row is already gone", async () => {
    prismaMock.item.findFirst.mockResolvedValue({
      fileUrl: "https://public.example/user-1/abc-photo.png",
    });
    prismaMock.item.deleteMany.mockResolvedValue({ count: 1 });
    deleteFromR2Mock.mockRejectedValueOnce(new Error("R2 object not found"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(deleteItem("item-1")).resolves.toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("skips R2 cleanup when the row was already gone by the time it deleted", async () => {
    prismaMock.item.findFirst.mockResolvedValue({
      fileUrl: "https://public.example/user-1/abc-photo.png",
    });
    prismaMock.item.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteItem("item-1")).resolves.toBe(false);
    expect(deleteFromR2Mock).not.toHaveBeenCalled();
  });
});
