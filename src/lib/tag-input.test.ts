import { describe, expect, it } from "vitest";
import { mergeTagInput } from "@/lib/tag-input";

describe("mergeTagInput", () => {
  it("appends suggestions to empty input", () => {
    expect(mergeTagInput("", ["react", "hooks"])).toBe("react, hooks");
  });

  it("appends suggestions after existing tags", () => {
    expect(mergeTagInput("react, hooks", ["typescript"])).toBe("react, hooks, typescript");
  });

  it("skips a trailing comma and whitespace instead of producing a double comma", () => {
    expect(mergeTagInput("react, vue, ", ["typescript"])).toBe("react, vue, typescript");
  });

  it("dedupes case-insensitively against existing tags", () => {
    expect(mergeTagInput("React, Vue", ["react", "typescript"])).toBe("React, Vue, typescript");
  });

  it("returns the input unchanged when every suggestion is already present", () => {
    expect(mergeTagInput("react, hooks", ["React", "HOOKS"])).toBe("react, hooks");
  });

  it("returns the input unchanged when there are no suggestions", () => {
    expect(mergeTagInput("react, hooks", [])).toBe("react, hooks");
  });
});
