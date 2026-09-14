import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createItemSchema, updateItemSchema } from "@/lib/validations/items";

// Matches src/lib/safe-redirect.test.ts's established pattern for a test file
// that mutates a real env var: capture the original at module scope and
// explicitly restore it in afterEach, rather than relying on the next test's
// beforeEach to overwrite whatever a prior test (e.g. the "R2_PUBLIC_URL is
// unset" case below) left behind — safe under this project's default
// per-file test isolation, but explicit restoration doesn't depend on that.
const originalR2PublicUrl = process.env.R2_PUBLIC_URL;

beforeEach(() => {
  process.env.R2_PUBLIC_URL = "https://public.example";
});

afterEach(() => {
  process.env.R2_PUBLIC_URL = originalR2PublicUrl;
});

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

  it("rejects a fileName with no fileUrl", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "snippet",
      fileUrl: null,
      fileName: "orphaned-name.png",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a fileUrl on the same origin as R2_PUBLIC_URL", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "image",
      fileUrl: "https://public.example/user-2/other-photo.png",
      fileName: "other-photo.png",
      fileSize: 2048,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a title at exactly the 200-char boundary", () => {
    const result = createItemSchema.safeParse({ ...base, type: "snippet", title: "a".repeat(200) });
    expect(result.success).toBe(true);
  });

  it("rejects a title over the 200-char boundary", () => {
    const result = createItemSchema.safeParse({ ...base, type: "snippet", title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects a description over the 10000-char boundary", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "snippet",
      description: "a".repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects content over the 100000-char boundary", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "snippet",
      content: "a".repeat(100001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a language string over the 50-char boundary", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "snippet",
      language: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a single tag over the 50-char boundary", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "snippet",
      tags: ["a".repeat(51)],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 tags", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "snippet",
      tags: Array.from({ length: 21 }, (_, i) => `tag-${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 20 tags", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "snippet",
      tags: Array.from({ length: 20 }, (_, i) => `tag-${i}`),
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 50 collectionIds", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "snippet",
      collectionIds: Array.from({ length: 51 }, (_, i) => `col-${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a collectionId over the 100-char boundary", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "snippet",
      collectionIds: ["a".repeat(101)],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a javascript: URL on a link item", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "link",
      url: "javascript:alert(document.cookie)",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a fileUrl on a different origin than R2_PUBLIC_URL", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "image",
      fileUrl: "https://evil.example/user-1/photo.png",
      fileName: "photo.png",
      fileSize: 1024,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a fileUrl whose host merely starts with the R2 origin's hostname (prefix-confusion check)", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "image",
      fileUrl: "https://public.example.evil.com/user-1/photo.png",
      fileName: "photo.png",
      fileSize: 1024,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a fileSize over the largest FILE_CONSTRAINTS ceiling (10MB)", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "file",
      fileUrl: "https://public.example/user-1/big.pdf",
      fileName: "big.pdf",
      fileSize: 10 * 1024 * 1024 + 1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a fileSize at exactly the 10MB ceiling", () => {
    const result = createItemSchema.safeParse({
      ...base,
      type: "file",
      fileUrl: "https://public.example/user-1/big.pdf",
      fileName: "big.pdf",
      fileSize: 10 * 1024 * 1024,
    });
    expect(result.success).toBe(true);
  });

  it("rejects when R2_PUBLIC_URL is unset — fails closed rather than accepting any URL", () => {
    delete process.env.R2_PUBLIC_URL;
    const result = createItemSchema.safeParse({
      ...base,
      type: "image",
      fileUrl: "https://public.example/user-1/photo.png",
      fileName: "photo.png",
      fileSize: 1024,
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

  it("rejects a title over the 200-char boundary", () => {
    const result = updateItemSchema.safeParse({
      title: "a".repeat(201),
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      collectionIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects content over the 100000-char boundary", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: "a".repeat(100001),
      url: null,
      language: null,
      tags: [],
      collectionIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a javascript: URL", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: null,
      url: "javascript:alert(1)",
      language: null,
      tags: [],
      collectionIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a fileUrl on the same origin as R2_PUBLIC_URL", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: null,
      url: null,
      language: null,
      fileUrl: "https://public.example/user-1/new-photo.png",
      fileName: "new-photo.png",
      fileSize: 2048,
      tags: [],
      collectionIds: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a fileUrl on a different origin than R2_PUBLIC_URL", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: null,
      url: null,
      language: null,
      fileUrl: "https://evil.example/user-1/photo.png",
      fileName: "photo.png",
      fileSize: 1024,
      tags: [],
      collectionIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a fileSize over the largest FILE_CONSTRAINTS ceiling (10MB)", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: null,
      url: null,
      language: null,
      fileUrl: "https://public.example/user-1/big.pdf",
      fileName: "big.pdf",
      fileSize: 10 * 1024 * 1024 + 1,
      tags: [],
      collectionIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 tags", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: null,
      url: null,
      language: null,
      tags: Array.from({ length: 21 }, (_, i) => `tag-${i}`),
      collectionIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 50 collectionIds", () => {
    const result = updateItemSchema.safeParse({
      title: "Updated",
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      collectionIds: Array.from({ length: 51 }, (_, i) => `col-${i}`),
    });
    expect(result.success).toBe(false);
  });
});
