import { describe, expect, it } from "vitest";
import { createItemSchema, updateItemSchema } from "@/lib/validations/items";

const base = {
  title: "My Item",
  description: null,
  content: null,
  url: null,
  language: null,
  fileUrl: null,
  fileName: null,
  fileSize: null,
  tags: [],
};

describe("createItemSchema", () => {
  it("accepts a valid snippet", () => {
    const result = createItemSchema.safeParse({ ...base, type: "snippet", content: "code" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = createItemSchema.safeParse({ ...base, type: "snippet", title: "  " });
    expect(result.success).toBe(false);
  });

  it("rejects a link item with no url", () => {
    const result = createItemSchema.safeParse({ ...base, type: "link", url: null });
    expect(result.success).toBe(false);
  });

  it("accepts a link item with a url", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "link",
      url: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a file item with no fileUrl", () => {
    const result = createItemSchema.safeParse({ ...base, type: "file", fileUrl: null });
    expect(result.success).toBe(false);
  });

  it("rejects an image item with no fileUrl", () => {
    const result = createItemSchema.safeParse({ ...base, type: "image", fileUrl: null });
    expect(result.success).toBe(false);
  });

  it("accepts an image item with a fileUrl", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "image",
      fileUrl: "https://public.example/user-1/abc-photo.png",
      fileName: "photo.png",
      fileSize: 1024,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateItemSchema", () => {
  it("accepts a valid update", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ["react"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid url", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: null,
      url: "not-a-url",
      language: null,
      tags: [],
    });
    expect(result.success).toBe(false);
  });
});
