import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createItem,
  deleteItem,
  setItemFavorite,
  setItemPinned,
  updateItem,
} from "@/lib/db/items-mutations";
import { ItemLimitExceededError } from "@/lib/subscription-limits";
import { Prisma } from "@/generated/prisma/client";

function p2034() {
  return new Prisma.PrismaClientKnownRequestError("Transaction failed due to a write conflict or a deadlock", {
    code: "P2034",
    clientVersion: "test",
  });
}

const { getCurrentUserIdMock, prismaMock, txMock } = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  txMock: {
    item: { create: vi.fn(), count: vi.fn() },
    itemTag: { deleteMany: vi.fn(), create: vi.fn(), createMany: vi.fn() },
    tag: { upsert: vi.fn() },
    itemCollection: { deleteMany: vi.fn(), createMany: vi.fn() },
    collection: { findMany: vi.fn() },
  },
  prismaMock: {
    item: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
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
  // tags/collectionIds default to empty so tests unrelated to tag/collection
  // replacement don't need to mock tx.tag.upsert/tx.collection.findMany too.
  const input = {
    title: "Updated title",
    description: null,
    content: null,
    url: null,
    language: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    tags: [] as string[],
    collectionIds: [] as string[],
  };

  it("returns null without writing tags/collections when the item isn't owned by the current user", async () => {
    prismaMock.item.findFirst.mockResolvedValueOnce(null); // previous-fileUrl lookup
    prismaMock.item.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(updateItem("item-1", input)).resolves.toBeNull();
    expect(prismaMock.item.updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      data: {
        title: "Updated title",
        description: null,
        content: null,
        url: null,
        language: null,
        fileUrl: null,
        fileName: null,
        fileSize: null,
      },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("logs and rethrows when the update itself fails, without ever reaching the transaction", async () => {
    const error = new Error("db down");
    prismaMock.item.findFirst.mockResolvedValueOnce({ fileUrl: null });
    prismaMock.item.updateMany.mockRejectedValueOnce(error);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(updateItem("item-1", input)).rejects.toThrow("db down");

    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to update item item-1:", error);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("replaces tags and returns the refreshed detail on success", async () => {
    prismaMock.item.findFirst
      .mockResolvedValueOnce({ fileUrl: null }) // previous-fileUrl lookup
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
    prismaMock.item.updateMany.mockResolvedValueOnce({ count: 1 });
    txMock.tag.upsert
      .mockResolvedValueOnce({ id: "tag-react" })
      .mockResolvedValueOnce({ id: "tag-hooks" });

    const result = await updateItem("item-1", { ...input, tags: ["react", "hooks"] });

    expect(prismaMock.item.updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      data: {
        title: "Updated title",
        description: null,
        content: null,
        url: null,
        language: null,
        fileUrl: null,
        fileName: null,
        fileSize: null,
      },
    });
    expect(txMock.itemTag.deleteMany).toHaveBeenCalledWith({ where: { itemId: "item-1" } });
    expect(txMock.tag.upsert).toHaveBeenCalledWith({
      where: { userId_name: { userId: "user-1", name: "react" } },
      update: {},
      create: { userId: "user-1", name: "react" },
    });
    expect(txMock.itemTag.createMany).toHaveBeenCalledWith({
      data: [
        { itemId: "item-1", tagId: "tag-react" },
        { itemId: "item-1", tagId: "tag-hooks" },
      ],
    });
    expect(result?.item.tags).toEqual(["react", "hooks"]);
    expect(result?.droppedCollectionIds).toEqual([]);
    expect(txMock.itemCollection.deleteMany).toHaveBeenCalledWith({ where: { itemId: "item-1" } });
    expect(txMock.collection.findMany).not.toHaveBeenCalled();
    expect(txMock.itemCollection.createMany).not.toHaveBeenCalled();
    expect(deleteFromR2Mock).not.toHaveBeenCalled();
  });

  it("dedupes duplicate tag names before upserting/joining, so createMany never sees a repeated tagId", async () => {
    prismaMock.item.findFirst
      .mockResolvedValueOnce({ fileUrl: null })
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
        tags: [{ tag: { name: "react" } }],
        collections: [],
      });
    prismaMock.item.updateMany.mockResolvedValueOnce({ count: 1 });
    txMock.tag.upsert.mockResolvedValueOnce({ id: "tag-react" });

    await updateItem("item-1", { ...input, tags: ["react", "react"] });

    expect(txMock.tag.upsert).toHaveBeenCalledTimes(1);
    expect(txMock.itemTag.createMany).toHaveBeenCalledWith({
      data: [{ itemId: "item-1", tagId: "tag-react" }],
    });
  });

  it("replaces collections, filtering out and reporting any ids not owned by the current user", async () => {
    prismaMock.item.findFirst
      .mockResolvedValueOnce({ fileUrl: null })
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
    prismaMock.item.updateMany.mockResolvedValueOnce({ count: 1 });
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
    expect(result?.item.collections).toEqual([{ id: "col-1", name: "React Patterns" }]);
    expect(result?.droppedCollectionIds).toEqual(["col-2"]);
  });

  it("deletes the previous R2 object when a file item's file is replaced", async () => {
    prismaMock.item.findFirst
      .mockResolvedValueOnce({ fileUrl: "https://public.example/user-1/old-photo.png" })
      .mockResolvedValueOnce({
        id: "item-1",
        title: "Updated title",
        description: null,
        contentType: "file",
        content: null,
        fileUrl: "https://public.example/user-1/new-photo.png",
        fileName: "new-photo.png",
        fileSize: 2048,
        url: null,
        language: null,
        isFavorite: false,
        isPinned: false,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        type: { id: "type-image", name: "image", icon: "Image", color: "#ec4899" },
        tags: [],
        collections: [],
      });
    prismaMock.item.updateMany.mockResolvedValueOnce({ count: 1 });

    await updateItem("item-1", {
      ...input,
      fileUrl: "https://public.example/user-1/new-photo.png",
      fileName: "new-photo.png",
      fileSize: 2048,
    });

    expect(extractKeyFromUrlMock).toHaveBeenCalledWith(
      "https://public.example/user-1/old-photo.png"
    );
    expect(deleteFromR2Mock).toHaveBeenCalledWith("user-1/old-photo.png");
  });

  it("does not delete the old R2 object when the file is left unchanged", async () => {
    const fileUrl = "https://public.example/user-1/photo.png";
    prismaMock.item.findFirst
      .mockResolvedValueOnce({ fileUrl })
      .mockResolvedValueOnce({
        id: "item-1",
        title: "Updated title",
        description: null,
        contentType: "file",
        content: null,
        fileUrl,
        fileName: "photo.png",
        fileSize: 2048,
        url: null,
        language: null,
        isFavorite: false,
        isPinned: false,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        type: { id: "type-image", name: "image", icon: "Image", color: "#ec4899" },
        tags: [],
        collections: [],
      });
    prismaMock.item.updateMany.mockResolvedValueOnce({ count: 1 });

    await updateItem("item-1", { ...input, fileUrl, fileName: "photo.png", fileSize: 2048 });

    expect(deleteFromR2Mock).not.toHaveBeenCalled();
  });

  it("still returns the updated item (and logs) when R2 cleanup of the replaced file fails", async () => {
    const cleanupError = new Error("R2 object not found");
    prismaMock.item.findFirst
      .mockResolvedValueOnce({ fileUrl: "https://public.example/user-1/old-photo.png" })
      .mockResolvedValueOnce({
        id: "item-1",
        title: "Updated title",
        description: null,
        contentType: "file",
        content: null,
        fileUrl: "https://public.example/user-1/new-photo.png",
        fileName: "new-photo.png",
        fileSize: 2048,
        url: null,
        language: null,
        isFavorite: false,
        isPinned: false,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        type: { id: "type-image", name: "image", icon: "Image", color: "#ec4899" },
        tags: [],
        collections: [],
      });
    prismaMock.item.updateMany.mockResolvedValueOnce({ count: 1 });
    deleteFromR2Mock.mockRejectedValueOnce(cleanupError);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await updateItem("item-1", {
      ...input,
      fileUrl: "https://public.example/user-1/new-photo.png",
      fileName: "new-photo.png",
      fileSize: 2048,
    });

    expect(result?.item.id).toBe("item-1");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to delete replaced R2 object for item item-1:",
      cleanupError
    );

    consoleErrorSpy.mockRestore();
  });

  it("logs and rethrows a refetch failure even though the update itself succeeded", async () => {
    const refetchError = new Error("refresh failed");
    prismaMock.item.findFirst
      .mockResolvedValueOnce({ fileUrl: null })
      .mockRejectedValueOnce(refetchError);
    prismaMock.item.updateMany.mockResolvedValueOnce({ count: 1 });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(updateItem("item-1", input)).rejects.toThrow("refresh failed");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to refetch item item-1 after updating:",
      refetchError
    );

    consoleErrorSpy.mockRestore();
  });

  it("returns null when the item is gone by the time it refetches (deleted between the update and the refresh)", async () => {
    prismaMock.item.findFirst.mockResolvedValueOnce({ fileUrl: null }).mockResolvedValueOnce(null);
    prismaMock.item.updateMany.mockResolvedValueOnce({ count: 1 });

    await expect(updateItem("item-1", input)).resolves.toBeNull();
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
    isPro: true,
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

  it("runs the transaction under Serializable isolation", async () => {
    txMock.item.create.mockResolvedValue(createdRow);

    await createItem({ ...input, tags: [] });

    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });

  it("retries via withSerializableRetry when Prisma reports a real P2034 write conflict, succeeding on the second attempt", async () => {
    prismaMock.$transaction
      .mockRejectedValueOnce(p2034())
      .mockImplementationOnce(async (cb: (tx: typeof txMock) => unknown) => cb(txMock));
    txMock.item.create.mockResolvedValue(createdRow);

    const result = await createItem({ ...input, tags: [] });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ...createdRow, type, tags: [], collections: [] });
  });

  it("gives up and rethrows after exhausting all retries on a persistent P2034 write conflict", async () => {
    prismaMock.$transaction.mockRejectedValue(p2034());

    await expect(createItem({ ...input, tags: [] })).rejects.toMatchObject({ code: "P2034" });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(5);
  });

  it("does not count existing items for a Pro user, and creates unconditionally", async () => {
    txMock.item.create.mockResolvedValue(createdRow);

    await createItem({ ...input, tags: [], isPro: true });

    expect(txMock.item.count).not.toHaveBeenCalled();
    expect(txMock.item.create).toHaveBeenCalled();
  });

  it("counts existing items for a free user and creates when under the limit", async () => {
    txMock.item.count.mockResolvedValue(49);
    txMock.item.create.mockResolvedValue(createdRow);

    await createItem({ ...input, tags: [], isPro: false });

    expect(txMock.item.count).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(txMock.item.create).toHaveBeenCalled();
  });

  it("throws ItemLimitExceededError for a free user at the limit, without creating the item", async () => {
    txMock.item.count.mockResolvedValue(50);

    await expect(createItem({ ...input, tags: [], isPro: false })).rejects.toThrow(
      ItemLimitExceededError
    );
    expect(txMock.item.create).not.toHaveBeenCalled();
  });

  it("throws ItemLimitExceededError for a free user over the limit, without creating the item", async () => {
    txMock.item.count.mockResolvedValue(51);

    await expect(createItem({ ...input, tags: [], isPro: false })).rejects.toThrow(
      ItemLimitExceededError
    );
    expect(txMock.item.create).not.toHaveBeenCalled();
  });
});

const itemDetailSelect = {
  id: true,
  title: true,
  description: true,
  contentType: true,
  content: true,
  fileUrl: true,
  fileName: true,
  fileSize: true,
  url: true,
  language: true,
  isFavorite: true,
  isPinned: true,
  createdAt: true,
  updatedAt: true,
  type: { select: { id: true, name: true, icon: true, color: true } },
  tags: { select: { tag: { select: { name: true } } } },
  collections: { select: { collection: { select: { id: true, name: true } } } },
};

describe("setItemFavorite", () => {
  it("returns null without refetching when the item isn't owned by the current user (or doesn't exist)", async () => {
    prismaMock.item.updateMany.mockResolvedValue({ count: 0 });

    const result = await setItemFavorite("item-1", true);

    expect(prismaMock.item.updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      data: { isFavorite: true },
    });
    expect(result).toBeNull();
    expect(prismaMock.item.findFirst).not.toHaveBeenCalled();
  });

  it("updates and returns the refreshed item detail on success", async () => {
    prismaMock.item.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.item.findFirst.mockResolvedValue({
      id: "item-1",
      title: "Existing",
      description: null,
      contentType: "text",
      content: null,
      fileUrl: null,
      fileName: null,
      fileSize: null,
      url: null,
      language: null,
      isFavorite: true,
      isPinned: false,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
      type: { id: "type-snippet", name: "snippet", icon: "Code", color: "#f97316" },
      tags: [],
      collections: [],
    });

    const result = await setItemFavorite("item-1", true);

    expect(prismaMock.item.findFirst).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      select: itemDetailSelect,
    });
    expect(result?.isFavorite).toBe(true);
  });

  it("logs and rethrows when the update fails, without ever reaching the refetch", async () => {
    const error = new Error("db down");
    prismaMock.item.updateMany.mockRejectedValue(error);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(setItemFavorite("item-1", true)).rejects.toThrow("db down");

    expect(prismaMock.item.updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      data: { isFavorite: true },
    });
    expect(prismaMock.item.findFirst).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("logs and rethrows a refetch failure even though the update itself succeeded", async () => {
    prismaMock.item.updateMany.mockResolvedValue({ count: 1 });
    const refetchError = new Error("refresh failed");
    prismaMock.item.findFirst.mockRejectedValue(refetchError);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(setItemFavorite("item-1", true)).rejects.toThrow("refresh failed");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to refetch item item-1 after favoriting:",
      refetchError
    );

    consoleErrorSpy.mockRestore();
  });

  it("returns null when the item is gone by the time it refetches (deleted between the update and the refresh)", async () => {
    prismaMock.item.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.item.findFirst.mockResolvedValue(null);

    await expect(setItemFavorite("item-1", true)).resolves.toBeNull();
  });
});

describe("setItemPinned", () => {
  it("returns null without refetching when the item isn't owned by the current user (or doesn't exist)", async () => {
    prismaMock.item.updateMany.mockResolvedValue({ count: 0 });

    const result = await setItemPinned("item-1", true);

    expect(prismaMock.item.updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      data: { isPinned: true },
    });
    expect(result).toBeNull();
    expect(prismaMock.item.findFirst).not.toHaveBeenCalled();
  });

  it("updates and returns the refreshed item detail on success", async () => {
    prismaMock.item.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.item.findFirst.mockResolvedValue({
      id: "item-1",
      title: "Existing",
      description: null,
      contentType: "text",
      content: null,
      fileUrl: null,
      fileName: null,
      fileSize: null,
      url: null,
      language: null,
      isFavorite: false,
      isPinned: true,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      type: { id: "type-1", name: "snippet", icon: "Code", color: "#f97316" },
      tags: [],
      collections: [],
    });

    const result = await setItemPinned("item-1", true);

    expect(prismaMock.item.findFirst).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      select: itemDetailSelect,
    });
    expect(result?.isPinned).toBe(true);
  });

  it("logs and rethrows when the update fails, without ever reaching the refetch", async () => {
    const error = new Error("db down");
    prismaMock.item.updateMany.mockRejectedValue(error);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(setItemPinned("item-1", true)).rejects.toThrow("db down");

    expect(prismaMock.item.updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      data: { isPinned: true },
    });
    expect(prismaMock.item.findFirst).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("logs and rethrows a refetch failure even though the update itself succeeded", async () => {
    prismaMock.item.updateMany.mockResolvedValue({ count: 1 });
    const refetchError = new Error("refresh failed");
    prismaMock.item.findFirst.mockRejectedValue(refetchError);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(setItemPinned("item-1", true)).rejects.toThrow("refresh failed");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to refetch item item-1 after pinning:",
      refetchError
    );

    consoleErrorSpy.mockRestore();
  });

  it("returns null when the item is gone by the time it refetches (deleted between the update and the refresh)", async () => {
    prismaMock.item.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.item.findFirst.mockResolvedValue(null);

    await expect(setItemPinned("item-1", true)).resolves.toBeNull();
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
