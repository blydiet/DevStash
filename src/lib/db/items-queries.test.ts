import { beforeEach, describe, expect, it, vi } from "vitest";
import { getItemDetail, getPinnedItems } from "@/lib/db/items-queries";

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
