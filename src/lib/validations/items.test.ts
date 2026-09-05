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
  collectionIds: [],
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

  it("rejects a fileUrl with no fileName", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "file",
      fileUrl: "https://public.example/user-1/abc-notes.txt",
      fileName: null,
    });
    expect(result.success).toBe(false);
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
      tags: ["react", "hooks"],
      collectionIds: [],
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
      tags: ["react"],
      collectionIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty (or whitespace-only) title", () => {
    const result = updateItemSchema.safeParse({
      title: "   ",
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ["react"],
      collectionIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty-string tag", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ["react", "  "],
      collectionIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts duplicate tag names (deduped downstream by the DB layer, not rejected here)", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ["react", "react"],
      collectionIds: [],
    });
    expect(result.success).toBe(true);
  });

  it("defaults fileUrl/fileName/fileSize to null when omitted", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ["react"],
      collectionIds: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fileUrl).toBeNull();
      expect(result.data.fileName).toBeNull();
      expect(result.data.fileSize).toBeNull();
    }
  });

  it("accepts an update replacing the file (fileUrl and fileName both present)", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: null,
      url: null,
      language: null,
      fileUrl: "https://public.example/user-1/new-photo.png",
      fileName: "new-photo.png",
      fileSize: 2048,
      tags: ["react"],
      collectionIds: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a fileUrl with no fileName", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: null,
      url: null,
      language: null,
      fileUrl: "https://public.example/user-1/new-photo.png",
      fileName: null,
      tags: ["react"],
      collectionIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a fileName with no fileUrl", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: null,
      url: null,
      language: null,
      fileUrl: null,
      fileName: "orphaned-name.png",
      tags: ["react"],
      collectionIds: [],
    });
    expect(result.success).toBe(false);
  });
});
