import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCollection,
  deleteCollection,
  getAllCollections,
  getCollectionStats,
  getRecentCollections,
  updateCollection,
} from "@/lib/db/collections";

const { getCurrentUserIdMock, prismaMock } = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  prismaMock: {
    collection: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
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
});

const snippetType = { id: "type-snippet", name: "snippet", icon: "Code", color: "#f97316" };
const noteType = { id: "type-note", name: "note", icon: "StickyNote", color: "#22c55e" };

describe("getCollectionStats", () => {
  it("returns total and favorite counts scoped to the current user", async () => {
    prismaMock.collection.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);

    await expect(getCollectionStats()).resolves.toEqual({ total: 5, favorites: 2 });
    expect(prismaMock.collection.count).toHaveBeenNthCalledWith(1, { where: { userId: "user-1" } });
    expect(prismaMock.collection.count).toHaveBeenNthCalledWith(2, {
      where: { userId: "user-1", isFavorite: true },
    });
  });
});

describe("getRecentCollections", () => {
  it("derives borderColor from the most-used item type and dedupes types", async () => {
    prismaMock.collection.findMany.mockResolvedValue([
      {
        id: "col-1",
        name: "React Patterns",
        description: null,
        isFavorite: false,
        items: [
          { item: { typeId: "type-snippet", type: snippetType } },
          { item: { typeId: "type-snippet", type: snippetType } },
          { item: { typeId: "type-note", type: noteType } },
        ],
      },
    ]);

    const [result] = await getRecentCollections();

    expect(result.itemCount).toBe(3);
    expect(result.borderColor).toBe(snippetType.color);
    expect(result.types).toEqual([snippetType, noteType]);
  });

  it("falls back to a default border color when the collection has no items", async () => {
    prismaMock.collection.findMany.mockResolvedValue([
      { id: "col-2", name: "Empty", description: null, isFavorite: false, items: [] },
    ]);

    const [result] = await getRecentCollections();

    expect(result.itemCount).toBe(0);
    expect(result.borderColor).toBe("#94a3b8");
    expect(result.types).toEqual([]);
  });
});

describe("getAllCollections", () => {
  it("returns id/name pairs for the current user's collections, ordered by name", async () => {
    prismaMock.collection.findMany.mockResolvedValue([
      { id: "col-1", name: "AI Workflows" },
      { id: "col-2", name: "React Patterns" },
    ]);

    const result = await getAllCollections();

    expect(prismaMock.collection.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    expect(result).toEqual([
      { id: "col-1", name: "AI Workflows" },
      { id: "col-2", name: "React Patterns" },
    ]);
  });
});

describe("createCollection", () => {
  it("creates a collection scoped to the current user and returns a summary", async () => {
    prismaMock.collection.create.mockResolvedValue({
      id: "col-3",
      name: "Python Snippets",
      description: "Useful scripts",
      isFavorite: false,
    });

    const result = await createCollection({ name: "Python Snippets", description: "Useful scripts" });

    expect(prismaMock.collection.create).toHaveBeenCalledWith({
      data: { name: "Python Snippets", description: "Useful scripts", userId: "user-1" },
    });
    expect(result).toEqual({
      id: "col-3",
      name: "Python Snippets",
      description: "Useful scripts",
      isFavorite: false,
      itemCount: 0,
      borderColor: "#94a3b8",
      types: [],
    });
  });
});

describe("updateCollection", () => {
  it("updates a collection owned by the current user and returns its detail", async () => {
    prismaMock.collection.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.collection.findFirst.mockResolvedValue({
      id: "col-1",
      name: "Renamed",
      description: "New description",
      isFavorite: false,
    });

    const result = await updateCollection("col-1", { name: "Renamed", description: "New description" });

    expect(prismaMock.collection.updateMany).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1" },
      data: { name: "Renamed", description: "New description" },
    });
    expect(prismaMock.collection.findFirst).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1" },
      select: { id: true, name: true, description: true, isFavorite: true },
    });
    expect(result).toEqual({
      id: "col-1",
      name: "Renamed",
      description: "New description",
      isFavorite: false,
    });
  });

  it("returns null without refetching when the collection is missing or not owned", async () => {
    prismaMock.collection.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateCollection("col-2", { name: "Renamed", description: null });

    expect(result).toBeNull();
    expect(prismaMock.collection.findFirst).not.toHaveBeenCalled();
  });
});

describe("deleteCollection", () => {
  it("deletes a collection scoped to the current user and returns true", async () => {
    prismaMock.collection.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteCollection("col-1");

    expect(prismaMock.collection.deleteMany).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1" },
    });
    expect(result).toBe(true);
  });

  it("returns false when the collection is missing or not owned", async () => {
    prismaMock.collection.deleteMany.mockResolvedValue({ count: 0 });

    const result = await deleteCollection("col-2");

    expect(result).toBe(false);
  });
});
