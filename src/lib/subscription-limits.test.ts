import { describe, expect, it } from "vitest";
import { isProOnlyItemType } from "@/lib/subscription-limits";

describe("isProOnlyItemType", () => {
  it("returns true for a gated type name", () => {
    expect(isProOnlyItemType("file")).toBe(true);
    expect(isProOnlyItemType("image")).toBe(true);
  });

  it("returns false for an ungated type name", () => {
    expect(isProOnlyItemType("snippet")).toBe(false);
  });
});
