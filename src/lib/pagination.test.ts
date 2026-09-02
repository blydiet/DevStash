import { describe, expect, it } from "vitest";
import { clampPage, getPaginationRange, getTotalPages, parsePageParam } from "@/lib/pagination";

describe("parsePageParam", () => {
  it("returns 1 when the value is undefined", () => {
    expect(parsePageParam(undefined)).toBe(1);
  });

  it("returns 1 when the value is not a number", () => {
    expect(parsePageParam("abc")).toBe(1);
  });

  it("returns 1 when the value is zero or negative", () => {
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-3")).toBe(1);
  });

  it("returns 1 when the value is not an integer", () => {
    expect(parsePageParam("2.5")).toBe(1);
  });

  it("parses a valid positive integer", () => {
    expect(parsePageParam("3")).toBe(3);
  });
});

describe("getTotalPages", () => {
  it("rounds up to the nearest whole page", () => {
    expect(getTotalPages(45, 21)).toBe(3);
  });

  it("returns 1 when there are no items, so an empty list still has a valid page 1", () => {
    expect(getTotalPages(0, 21)).toBe(1);
  });

  it("returns exactly 1 page when the count divides evenly", () => {
    expect(getTotalPages(21, 21)).toBe(1);
  });
});

describe("clampPage", () => {
  it("clamps a page beyond the last page down to the last page", () => {
    expect(clampPage(9999, 3)).toBe(3);
  });

  it("clamps a page below 1 up to 1", () => {
    expect(clampPage(0, 3)).toBe(1);
  });

  it("leaves an in-range page untouched", () => {
    expect(clampPage(2, 3)).toBe(2);
  });

  it("falls back to 1 for a NaN page, e.g. an unsanitized caller passing Number(undefined)", () => {
    expect(clampPage(NaN, 3)).toBe(1);
  });

  it("falls back to 1 for a non-integer page", () => {
    expect(clampPage(2.5, 3)).toBe(1);
  });
});

describe("getPaginationRange", () => {
  it("returns every page when total is within the no-ellipsis threshold", () => {
    expect(getPaginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("shows a right ellipsis when the current page is near the start", () => {
    expect(getPaginationRange(1, 10)).toEqual([1, 2, "ellipsis", 10]);
  });

  it("shows a left ellipsis when the current page is near the end", () => {
    expect(getPaginationRange(10, 10)).toEqual([1, "ellipsis", 9, 10]);
  });

  it("shows both ellipses when the current page is in the middle", () => {
    expect(getPaginationRange(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  });

  describe("at the exact total where windowing first kicks in (total = 8)", () => {
    it("first page: right ellipsis only, no off-by-one duplicate of page 1", () => {
      expect(getPaginationRange(1, 8)).toEqual([1, 2, "ellipsis", 8]);
    });

    it("middle page: both ellipses, siblings correctly bracket the current page", () => {
      expect(getPaginationRange(4, 8)).toEqual([1, "ellipsis", 3, 4, 5, "ellipsis", 8]);
    });

    it("last page: left ellipsis only, no off-by-one duplicate of the last page", () => {
      expect(getPaginationRange(8, 8)).toEqual([1, "ellipsis", 7, 8]);
    });
  });
});
