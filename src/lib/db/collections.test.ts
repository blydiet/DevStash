import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCollectionStats, getRecentCollections } from "@/lib/db/collections";

const { getCurrentUserIdMock, prismaMock } = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  prismaMock: {
    collection: {
      count: vi.fn(),
      findMany: vi.fn(),
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
          { typeId: "type-snippet", type: snippetType },
          { typeId: "type-snippet", type: snippetType },
          { typeId: "type-note", type: noteType },
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
