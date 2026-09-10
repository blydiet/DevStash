import { describe, expect, it } from "vitest";
import { suggestTagsForDraftSchema, summarizeDraftSchema } from "@/lib/validations/ai";

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

describe("summarizeDraftSchema", () => {
  it("accepts a full title/content/url draft", () => {
    const result = summarizeDraftSchema.safeParse({
      title: "My Title",
      content: "some draft content",
      url: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all-blank fields (the action handles that as 'nothing to summarize')", () => {
    const result = summarizeDraftSchema.safeParse({ title: "", content: "   ", url: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a non-string title value", () => {
    const result = summarizeDraftSchema.safeParse({ title: 123, content: "", url: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-string content value", () => {
    const result = summarizeDraftSchema.safeParse({ title: "", content: 123, url: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-string url value", () => {
    const result = summarizeDraftSchema.safeParse({ title: "", content: "", url: 123 });
    expect(result.success).toBe(false);
  });

  it("rejects a missing title field", () => {
    const result = summarizeDraftSchema.safeParse({ content: "", url: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing content field", () => {
    const result = summarizeDraftSchema.safeParse({ title: "", url: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing url field", () => {
    const result = summarizeDraftSchema.safeParse({ title: "", content: "" });
    expect(result.success).toBe(false);
  });

  it("accepts title/content/url exactly at their max length", () => {
    const result = summarizeDraftSchema.safeParse({
      title: "a".repeat(500),
      content: "a".repeat(20000),
      url: "a".repeat(2048),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a title one character past its max length", () => {
    const result = summarizeDraftSchema.safeParse({ title: "a".repeat(501), content: "", url: "" });
    expect(result.success).toBe(false);
  });

  it("rejects content one character past its max length", () => {
    const result = summarizeDraftSchema.safeParse({ title: "", content: "a".repeat(20001), url: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a url one character past its max length", () => {
    const result = summarizeDraftSchema.safeParse({ title: "", content: "", url: "a".repeat(2049) });
    expect(result.success).toBe(false);
  });

  it("strips unexpected extra fields rather than rejecting the whole payload", () => {
    const result = summarizeDraftSchema.safeParse({
      title: "T",
      content: "",
      url: "",
      extra: "should not survive",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ title: "T", content: "", url: "" });
    }
  });
});
