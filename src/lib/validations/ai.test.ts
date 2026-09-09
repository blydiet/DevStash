import { describe, expect, it } from "vitest";
import { suggestTagsForDraftSchema } from "@/lib/validations/ai";

describe("suggestTagsForDraftSchema", () => {
  it("accepts real content with existing tags", () => {
    const result = suggestTagsForDraftSchema.safeParse({
      content: "some draft content",
      existingTags: ["react", "hooks"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty existingTags array", () => {
    const result = suggestTagsForDraftSchema.safeParse({ content: "some draft content", existingTags: [] });
    expect(result.success).toBe(true);
  });

  it("accepts empty or whitespace-only content (the action handles that as 'nothing to analyze')", () => {
    const result = suggestTagsForDraftSchema.safeParse({ content: "   ", existingTags: [] });
    expect(result.success).toBe(true);
  });

  it("rejects a non-string content value", () => {
    const result = suggestTagsForDraftSchema.safeParse({ content: 123, existingTags: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an existingTags entry that's empty after trimming", () => {
    const result = suggestTagsForDraftSchema.safeParse({
      content: "some draft content",
      existingTags: ["react", "   "],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing existingTags field", () => {
    const result = suggestTagsForDraftSchema.safeParse({ content: "some draft content" });
    expect(result.success).toBe(false);
  });
});
