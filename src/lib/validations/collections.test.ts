import { describe, expect, it } from "vitest";
import { createCollectionSchema, updateCollectionSchema } from "@/lib/validations/collections";

describe("createCollectionSchema", () => {
  it("accepts a valid name with a description", () => {
    const result = createCollectionSchema.safeParse({ name: "React Patterns", description: "Hooks" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid name with no description", () => {
    const result = createCollectionSchema.safeParse({ name: "React Patterns", description: null });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createCollectionSchema.safeParse({ name: "  ", description: null });
    expect(result.success).toBe(false);
  });

  it("trims surrounding whitespace from name", () => {
    const result = createCollectionSchema.safeParse({ name: "  React Patterns  ", description: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("React Patterns");
    }
  });

  it("rejects an entirely omitted description — the field is required (as null), not optional", () => {
    const result = createCollectionSchema.safeParse({ name: "React Patterns" });
    expect(result.success).toBe(false);
  });

  it("accepts a name at exactly the 200-char boundary", () => {
    const result = createCollectionSchema.safeParse({ name: "a".repeat(200), description: null });
    expect(result.success).toBe(true);
  });

  it("rejects a name over the 200-char boundary", () => {
    const result = createCollectionSchema.safeParse({ name: "a".repeat(201), description: null });
    expect(result.success).toBe(false);
  });

  it("accepts a description at exactly the 10000-char boundary", () => {
    const result = createCollectionSchema.safeParse({ name: "React Patterns", description: "a".repeat(10000) });
    expect(result.success).toBe(true);
  });

  it("rejects a description over the 10000-char boundary", () => {
    const result = createCollectionSchema.safeParse({ name: "React Patterns", description: "a".repeat(10001) });
    expect(result.success).toBe(false);
  });
});

describe("updateCollectionSchema", () => {
  it("accepts a valid name with a description", () => {
    const result = updateCollectionSchema.safeParse({ name: "React Patterns", description: "Hooks" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid name with no description", () => {
    const result = updateCollectionSchema.safeParse({ name: "React Patterns", description: null });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = updateCollectionSchema.safeParse({ name: "  ", description: null });
    expect(result.success).toBe(false);
  });

  it("trims surrounding whitespace from name", () => {
    const result = updateCollectionSchema.safeParse({ name: "  React Patterns  ", description: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("React Patterns");
    }
  });

  it("rejects an entirely omitted description — the field is required (as null), not optional", () => {
    const result = updateCollectionSchema.safeParse({ name: "React Patterns" });
    expect(result.success).toBe(false);
  });

  it("accepts a name at exactly the 200-char boundary", () => {
    const result = updateCollectionSchema.safeParse({ name: "a".repeat(200), description: null });
    expect(result.success).toBe(true);
  });

  it("rejects a name over the 200-char boundary", () => {
    const result = updateCollectionSchema.safeParse({ name: "a".repeat(201), description: null });
    expect(result.success).toBe(false);
  });

  it("accepts a description at exactly the 10000-char boundary", () => {
    const result = updateCollectionSchema.safeParse({ name: "React Patterns", description: "a".repeat(10000) });
    expect(result.success).toBe(true);
  });

  it("rejects a description over the 10000-char boundary", () => {
    const result = updateCollectionSchema.safeParse({ name: "React Patterns", description: "a".repeat(10001) });
    expect(result.success).toBe(false);
  });
});
