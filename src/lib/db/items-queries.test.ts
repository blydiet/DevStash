import { beforeEach, describe, expect, it, vi } from "vitest";
import { getItemDetail, getPinnedItems, getSearchableItems } from "@/lib/db/items-queries";

const { getCurrentUserIdMock, prismaMock } = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  prismaMock: {
    item: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
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
