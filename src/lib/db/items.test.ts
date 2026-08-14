import { beforeEach, describe, expect, it, vi } from "vitest";
import { getItemTypeByName, getItemTypes, getPinnedItems } from "@/lib/db/items";

const { getCurrentUserIdMock, prismaMock } = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  prismaMock: {
    item: {
      findMany: vi.fn(),
    },
    itemType: {
      findFirst: vi.fn(),
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
