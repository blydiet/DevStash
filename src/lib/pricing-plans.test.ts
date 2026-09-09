import { describe, expect, it } from "vitest";
import { isKnownProFeature, PRO_FEATURE_UPGRADE_CONTEXT } from "@/lib/pricing-plans";

describe("isKnownProFeature", () => {
  it.each(Object.keys(PRO_FEATURE_UPGRADE_CONTEXT))("returns true for the known feature %s", (feature) => {
    expect(isKnownProFeature(feature)).toBe(true);
  });

  it("returns false for an unrecognized value", () => {
    expect(isKnownProFeature("bogus-feature")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isKnownProFeature("")).toBe(false);
  });
});
