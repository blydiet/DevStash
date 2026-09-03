import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCollection,
  deleteCollection,
  getAllCollections,
  getCollectionsPage,
  getCollectionStats,
  getFavoriteCollections,
  getRecentCollections,
  setCollectionFavorite,
  updateCollection,
} from "@/lib/db/collections";
import { COLLECTIONS_PER_PAGE } from "@/lib/pagination";

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

describe("getCollectionsPage", () => {
  it("counts, then fetches the requested page ordered by updatedAt desc with id as a stable tiebreaker", async () => {
    prismaMock.collection.count.mockResolvedValue(50);
    prismaMock.collection.findMany.mockResolvedValue([]);

    await getCollectionsPage(2);

    expect(prismaMock.collection.count).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(prismaMock.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: COLLECTIONS_PER_PAGE,
        take: COLLECTIONS_PER_PAGE,
      })
    );
  });

  it("clamps a requested page beyond the last page down to the actual last page (not just page 1)", async () => {
    // 50 collections at 21/page = 3 real pages; requesting page 9999 must land on page 3,
    // not merely "not 9999" — a broken clamp that always returns 1 would also pass a
    // looser assertion here.
    prismaMock.collection.count.mockResolvedValue(50);
    prismaMock.collection.findMany.mockResolvedValue([]);

    const result = await getCollectionsPage(9999);

    expect(result.currentPage).toBe(3);
    expect(prismaMock.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 2 * COLLECTIONS_PER_PAGE, take: COLLECTIONS_PER_PAGE })
    );
  });

  it.each([0, -5])(
    "clamps a requested page below 1 (%i) up to page 1 with skip: 0",
    async (requestedPage) => {
      prismaMock.collection.count.mockResolvedValue(50);
      prismaMock.collection.findMany.mockResolvedValue([]);

      const result = await getCollectionsPage(requestedPage);

      expect(result.currentPage).toBe(1);
      expect(prismaMock.collection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: COLLECTIONS_PER_PAGE })
      );
    }
  );

  it("does not compute a negative skip when there are zero collections (Math.ceil(0/21) would be 0, not 1)", async () => {
    prismaMock.collection.count.mockResolvedValue(0);
    prismaMock.collection.findMany.mockResolvedValue([]);

    const result = await getCollectionsPage(1);

    expect(result.currentPage).toBe(1);
    expect(prismaMock.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: COLLECTIONS_PER_PAGE })
    );
  });

  it("returns totalCount alongside collections mapped the same way as getRecentCollections", async () => {
    prismaMock.collection.count.mockResolvedValue(3);
    prismaMock.collection.findMany.mockResolvedValue([
      {
        id: "col-1",
        name: "React Patterns",
        description: null,
        isFavorite: false,
        items: [{ item: { typeId: "type-snippet", type: snippetType } }],
      },
    ]);

    const result = await getCollectionsPage();

    expect(result.totalCount).toBe(3);
    expect(result.collections).toEqual([
      {
        id: "col-1",
        name: "React Patterns",
        description: null,
        isFavorite: false,
        itemCount: 1,
        borderColor: snippetType.color,
        types: [snippetType],
      },
    ]);
  });

  it("propagates a session failure instead of returning an empty page", async () => {
    getCurrentUserIdMock.mockRejectedValue(new Error("Not authenticated"));

    await expect(getCollectionsPage()).rejects.toThrow("Not authenticated");
    expect(prismaMock.collection.count).not.toHaveBeenCalled();
  });
});

describe("getFavoriteCollections", () => {
  it("scopes to the current user's favorited collections, sorted by updatedAt desc (most recently favorited), selecting id/name/createdAt", async () => {
    prismaMock.collection.findMany.mockResolvedValue([]);

    await getFavoriteCollections();

    expect(prismaMock.collection.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isFavorite: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, createdAt: true },
    });
  });

  it("maps id/name/createdAt for each favorite collection", async () => {
    prismaMock.collection.findMany.mockResolvedValue([
      { id: "col-1", name: "React Patterns", createdAt: new Date("2026-01-02") },
    ]);

    const result = await getFavoriteCollections();

    expect(result).toEqual([
      { id: "col-1", name: "React Patterns", createdAt: new Date("2026-01-02") },
    ]);
  });

  it("propagates a session failure instead of returning an empty list", async () => {
    getCurrentUserIdMock.mockRejectedValue(new Error("Not authenticated"));

    await expect(getFavoriteCollections()).rejects.toThrow("Not authenticated");
    expect(prismaMock.collection.findMany).not.toHaveBeenCalled();
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

describe("setCollectionFavorite", () => {
  it("updates and returns the refreshed detail on success", async () => {
    prismaMock.collection.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.collection.findFirst.mockResolvedValue({
      id: "col-1",
      name: "React Patterns",
      description: null,
      isFavorite: true,
    });

    const result = await setCollectionFavorite("col-1", true);

    expect(prismaMock.collection.updateMany).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1" },
      data: { isFavorite: true },
    });
    expect(prismaMock.collection.findFirst).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1" },
      select: { id: true, name: true, description: true, isFavorite: true },
    });
    expect(result).toEqual({
      id: "col-1",
      name: "React Patterns",
      description: null,
      isFavorite: true,
    });
  });

  it("returns null without refetching when the collection isn't owned by the current user (or doesn't exist)", async () => {
    prismaMock.collection.updateMany.mockResolvedValue({ count: 0 });

    const result = await setCollectionFavorite("col-2", true);

    expect(result).toBeNull();
    expect(prismaMock.collection.findFirst).not.toHaveBeenCalled();
  });

  it("logs and rethrows when the update fails, without ever reaching the refetch", async () => {
    const error = new Error("db down");
    prismaMock.collection.updateMany.mockRejectedValue(error);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(setCollectionFavorite("col-1", true)).rejects.toThrow("db down");

    expect(prismaMock.collection.findFirst).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("logs and rethrows a refetch failure even though the update itself succeeded", async () => {
    prismaMock.collection.updateMany.mockResolvedValue({ count: 1 });
    const refetchError = new Error("refresh failed");
    prismaMock.collection.findFirst.mockRejectedValue(refetchError);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(setCollectionFavorite("col-1", true)).rejects.toThrow("refresh failed");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to refetch collection col-1 after favoriting:",
      refetchError
    );

    consoleErrorSpy.mockRestore();
  });

  it("returns null when the collection is gone by the time it refetches", async () => {
    prismaMock.collection.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.collection.findFirst.mockResolvedValue(null);

    await expect(setCollectionFavorite("col-1", true)).resolves.toBeNull();
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
