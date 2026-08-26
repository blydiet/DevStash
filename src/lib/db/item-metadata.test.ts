import { beforeEach, describe, expect, it, vi } from "vitest";
import { getItemTypeByName, getItemTypes } from "@/lib/db/item-metadata";

const { getCurrentUserIdMock, prismaMock } = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  prismaMock: {
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
