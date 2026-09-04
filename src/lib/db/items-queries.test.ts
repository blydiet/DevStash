import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFavoriteItems,
  getItemDetail,
  getItemsByCollection,
  getItemsByType,
  getPinnedItems,
  getSearchableItems,
  PAGINATED_ITEM_ORDER,
} from "@/lib/db/items-queries";
import { ITEMS_PER_PAGE } from "@/lib/pagination";

const { getCurrentUserIdMock, prismaMock } = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  prismaMock: {
    item: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
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
        fileUrl: null,
      },
    ]);

    const [result] = await getPinnedItems();

    expect(result.tags).toEqual(["react", "hooks"]);
    expect(result.type.name).toBe("snippet");
    expect(result.fileUrl).toBeNull();
  });
});

describe("getFavoriteItems", () => {
  it("scopes to the current user's favorited items, sorted by updatedAt desc (most recently favorited), selecting id/title/createdAt/type", async () => {
    prismaMock.item.findMany.mockResolvedValue([]);

    await getFavoriteItems();

    expect(prismaMock.item.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isFavorite: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        type: { select: { id: true, name: true, icon: true, color: true } },
      },
    });
  });

  it("maps the type relation and createdAt onto each favorite item", async () => {
    prismaMock.item.findMany.mockResolvedValue([
      {
        id: "item-1",
        title: "useDebounce Hook",
        createdAt: new Date("2026-01-02"),
        type: { id: "type-snippet", name: "snippet", icon: "Code", color: "#f97316" },
      },
    ]);

    const [result] = await getFavoriteItems();

    expect(result).toEqual({
      id: "item-1",
      title: "useDebounce Hook",
      createdAt: new Date("2026-01-02"),
      type: { id: "type-snippet", name: "snippet", icon: "Code", color: "#f97316" },
    });
  });

  it("propagates a session failure instead of returning an empty list", async () => {
    getCurrentUserIdMock.mockRejectedValue(new Error("Not authenticated"));

    await expect(getFavoriteItems()).rejects.toThrow("Not authenticated");
    expect(prismaMock.item.findMany).not.toHaveBeenCalled();
  });
});

describe("getItemsByType", () => {
  it("counts, then fetches the requested page scoped to the same where, ordered pinned-first then createdAt desc with id as a stable tiebreaker, assembling the result from both calls", async () => {
    prismaMock.item.count.mockResolvedValue(50);
    prismaMock.item.findMany.mockResolvedValue([]);

    const result = await getItemsByType("snippet", 2);

    const expectedWhere = { userId: "user-1", type: { name: "snippet" } };
    expect(prismaMock.item.count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(prismaMock.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        orderBy: PAGINATED_ITEM_ORDER,
        skip: ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
      })
    );
    expect(result).toEqual({ items: [], totalCount: 50, currentPage: 2 });
  });

  it("requests skip: 0 for a directly-requested page 1 (not just via clamping)", async () => {
    prismaMock.item.count.mockResolvedValue(50);
    prismaMock.item.findMany.mockResolvedValue([]);

    const result = await getItemsByType("snippet", 1);

    expect(result.currentPage).toBe(1);
    expect(prismaMock.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: ITEMS_PER_PAGE })
    );
  });

  it("clamps a requested page beyond the last page down to the actual last page (not just page 1)", async () => {
    // 50 items at 21/page = 3 real pages; requesting page 9999 must land on page 3,
    // not merely "not 9999" — a broken clamp that always returns 1 would also pass a
    // looser assertion here.
    prismaMock.item.count.mockResolvedValue(50);
    prismaMock.item.findMany.mockResolvedValue([]);

    const result = await getItemsByType("snippet", 9999);

    expect(result.currentPage).toBe(3);
    expect(prismaMock.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 2 * ITEMS_PER_PAGE, take: ITEMS_PER_PAGE })
    );
  });

  it.each([0, -5])(
    "clamps a requested page below 1 (%i) up to page 1 with skip: 0",
    async (requestedPage) => {
      prismaMock.item.count.mockResolvedValue(50);
      prismaMock.item.findMany.mockResolvedValue([]);

      const result = await getItemsByType("snippet", requestedPage);

      expect(result.currentPage).toBe(1);
      expect(prismaMock.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: ITEMS_PER_PAGE })
      );
    }
  );

  it("does not compute a negative skip when there are zero items (Math.ceil(0/21) would be 0, not 1)", async () => {
    prismaMock.item.count.mockResolvedValue(0);
    prismaMock.item.findMany.mockResolvedValue([]);

    const result = await getItemsByType("snippet", 1);

    expect(result.currentPage).toBe(1);
    expect(prismaMock.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: ITEMS_PER_PAGE })
    );
  });

  it("returns totalCount alongside the mapped items", async () => {
    prismaMock.item.count.mockResolvedValue(3);
    prismaMock.item.findMany.mockResolvedValue([
      {
        id: "item-1",
        title: "A",
        description: null,
        isFavorite: false,
        isPinned: false,
        createdAt: new Date("2026-01-01"),
        type: { id: "type-snippet", name: "snippet", icon: "Code", color: "#f97316" },
        tags: [],
        fileUrl: null,
        fileName: null,
        fileSize: null,
      },
    ]);

    const result = await getItemsByType("snippet");

    expect(result.totalCount).toBe(3);
    expect(result.items).toHaveLength(1);
  });

  it("propagates a session failure instead of returning an empty page", async () => {
    getCurrentUserIdMock.mockRejectedValue(new Error("Not authenticated"));

    await expect(getItemsByType("snippet")).rejects.toThrow("Not authenticated");
    expect(prismaMock.item.count).not.toHaveBeenCalled();
  });
});

describe("getItemsByCollection", () => {
  it("scopes to the collection and current user, fetching the requested page scoped to the same where, ordered pinned-first then createdAt desc with id as a stable tiebreaker, assembling the result from both calls", async () => {
    prismaMock.item.count.mockResolvedValue(50);
    prismaMock.item.findMany.mockResolvedValue([]);

    const result = await getItemsByCollection("col-1", 2);

    const expectedWhere = {
      userId: "user-1",
      collections: { some: { collectionId: "col-1", collection: { userId: "user-1" } } },
    };
    expect(prismaMock.item.count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(prismaMock.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        orderBy: PAGINATED_ITEM_ORDER,
        skip: ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
      })
    );
    expect(result).toEqual({ items: [], totalCount: 50, currentPage: 2 });
  });

  it("requests skip: 0 for a directly-requested page 1 (not just via clamping)", async () => {
    prismaMock.item.count.mockResolvedValue(50);
    prismaMock.item.findMany.mockResolvedValue([]);

    const result = await getItemsByCollection("col-1", 1);

    expect(result.currentPage).toBe(1);
    expect(prismaMock.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: ITEMS_PER_PAGE })
    );
  });

  it("clamps a requested page beyond the last page down to the actual last page (not just page 1)", async () => {
    prismaMock.item.count.mockResolvedValue(50);
    prismaMock.item.findMany.mockResolvedValue([]);

    const result = await getItemsByCollection("col-1", 9999);

    expect(result.currentPage).toBe(3);
    expect(prismaMock.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 2 * ITEMS_PER_PAGE, take: ITEMS_PER_PAGE })
    );
  });

  it.each([0, -5])(
    "clamps a requested page below 1 (%i) up to page 1 with skip: 0",
    async (requestedPage) => {
      prismaMock.item.count.mockResolvedValue(50);
      prismaMock.item.findMany.mockResolvedValue([]);

      const result = await getItemsByCollection("col-1", requestedPage);

      expect(result.currentPage).toBe(1);
      expect(prismaMock.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: ITEMS_PER_PAGE })
      );
    }
  );

  it("does not compute a negative skip when there are zero items in the collection", async () => {
    prismaMock.item.count.mockResolvedValue(0);
    prismaMock.item.findMany.mockResolvedValue([]);

    const result = await getItemsByCollection("col-1", 1);

    expect(result.currentPage).toBe(1);
    expect(prismaMock.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: ITEMS_PER_PAGE })
    );
  });

  it("propagates a session failure instead of returning an empty page", async () => {
    getCurrentUserIdMock.mockRejectedValue(new Error("Not authenticated"));

    await expect(getItemsByCollection("col-1")).rejects.toThrow("Not authenticated");
    expect(prismaMock.item.count).not.toHaveBeenCalled();
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
      collections: [{ collection: { id: "col-1", name: "React Patterns" } }],
    });

    const result = await getItemDetail("item-1");

    expect(prismaMock.item.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", userId: "user-1" } })
    );
    expect(result?.tags).toEqual(["react"]);
    expect(result?.collections).toEqual([{ id: "col-1", name: "React Patterns" }]);
  });

  it("returns null when no item matches (not found, or belongs to another user)", async () => {
    prismaMock.item.findFirst.mockResolvedValue(null);
    await expect(getItemDetail("item-1")).resolves.toBeNull();
  });
});

describe("getSearchableItems", () => {
  const type = { id: "type-snippet", name: "snippet", icon: "Code", color: "#f97316" };

  it("scopes the lookup to the current user", async () => {
    prismaMock.item.findMany.mockResolvedValue([]);

    await getSearchableItems();

    expect(prismaMock.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, take: 501 })
    );
  });

  it("prefers content, but falls through to description then url when content is empty or whitespace-only", async () => {
    prismaMock.item.findMany.mockResolvedValue([
      { id: "1", title: "A", content: "real content", description: "desc", url: null, type },
      { id: "2", title: "B", content: "", description: "desc", url: null, type },
      { id: "3", title: "C", content: "   ", description: "desc", url: null, type },
      { id: "4", title: "D", content: null, description: null, url: "https://example.com", type },
      { id: "5", title: "E", content: null, description: null, url: null, type },
    ]);

    const { items } = await getSearchableItems();

    expect(items.map((item) => item.contentPreview)).toEqual([
      "real content",
      "desc",
      "desc",
      "https://example.com",
      null,
    ]);
  });

  it("truncates previews longer than 140 characters with an ellipsis", async () => {
    const longContent = "a".repeat(150);
    prismaMock.item.findMany.mockResolvedValue([
      { id: "1", title: "A", content: longContent, description: null, url: null, type },
    ]);

    const { items } = await getSearchableItems();

    expect(items[0].contentPreview).toBe(`${"a".repeat(140)}…`);
  });

  it("reports truncated: false when the item count is within the cap", async () => {
    prismaMock.item.findMany.mockResolvedValue(
      Array.from({ length: 500 }, (_, i) => ({
        id: `${i}`,
        title: `Item ${i}`,
        content: null,
        description: null,
        url: null,
        type,
      }))
    );

    const { items, truncated } = await getSearchableItems();

    expect(items).toHaveLength(500);
    expect(truncated).toBe(false);
  });

  it("reports truncated: true and drops the extra item when the cap is exceeded", async () => {
    prismaMock.item.findMany.mockResolvedValue(
      Array.from({ length: 501 }, (_, i) => ({
        id: `${i}`,
        title: `Item ${i}`,
        content: null,
        description: null,
        url: null,
        type,
      }))
    );

    const { items, truncated } = await getSearchableItems();

    expect(items).toHaveLength(500);
    expect(truncated).toBe(true);
  });
});
