import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FREE_TIER_COLLECTION_LIMIT,
  FREE_TIER_ITEM_LIMIT,
  isAtCollectionLimit,
  isAtItemLimit,
  isProOnlyItemType,
} from "@/lib/subscription-limits";

const { getItemStatsMock, getCollectionStatsMock } = vi.hoisted(() => ({
  getItemStatsMock: vi.fn(),
  getCollectionStatsMock: vi.fn(),
}));

vi.mock("@/lib/db/item-metadata", () => ({
  getItemStats: getItemStatsMock,
}));

vi.mock("@/lib/db/collections", () => ({
  getCollectionStats: getCollectionStatsMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isProOnlyItemType", () => {
  it("returns true for a gated type name", () => {
    expect(isProOnlyItemType("file")).toBe(true);
    expect(isProOnlyItemType("image")).toBe(true);
  });

  it("returns false for an ungated type name", () => {
    expect(isProOnlyItemType("snippet")).toBe(false);
  });
});

describe("isAtItemLimit", () => {
  it("always returns false for a Pro user, without querying stats", async () => {
    await expect(isAtItemLimit(true)).resolves.toBe(false);
    expect(getItemStatsMock).not.toHaveBeenCalled();
  });

  it("returns false when a free user is below the limit", async () => {
    getItemStatsMock.mockResolvedValue({ total: FREE_TIER_ITEM_LIMIT - 1, favorites: 0 });
    await expect(isAtItemLimit(false)).resolves.toBe(false);
  });

  it("returns true when a free user is exactly at the limit", async () => {
    getItemStatsMock.mockResolvedValue({ total: FREE_TIER_ITEM_LIMIT, favorites: 0 });
    await expect(isAtItemLimit(false)).resolves.toBe(true);
  });

  it("returns true when a free user is above the limit", async () => {
    getItemStatsMock.mockResolvedValue({ total: FREE_TIER_ITEM_LIMIT + 1, favorites: 0 });
    await expect(isAtItemLimit(false)).resolves.toBe(true);
  });
});

describe("isAtCollectionLimit", () => {
  it("always returns false for a Pro user, without querying stats", async () => {
    await expect(isAtCollectionLimit(true)).resolves.toBe(false);
    expect(getCollectionStatsMock).not.toHaveBeenCalled();
  });

  it("returns false when a free user is below the limit", async () => {
    getCollectionStatsMock.mockResolvedValue({ total: FREE_TIER_COLLECTION_LIMIT - 1, favorites: 0 });
    await expect(isAtCollectionLimit(false)).resolves.toBe(false);
  });

  it("returns true when a free user is exactly at the limit", async () => {
    getCollectionStatsMock.mockResolvedValue({ total: FREE_TIER_COLLECTION_LIMIT, favorites: 0 });
    await expect(isAtCollectionLimit(false)).resolves.toBe(true);
  });

  it("returns true when a free user is above the limit", async () => {
    getCollectionStatsMock.mockResolvedValue({ total: FREE_TIER_COLLECTION_LIMIT + 1, favorites: 0 });
    await expect(isAtCollectionLimit(false)).resolves.toBe(true);
  });
});
