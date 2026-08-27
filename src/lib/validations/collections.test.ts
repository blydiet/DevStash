import { describe, expect, it } from "vitest";
import { createCollectionSchema } from "@/lib/validations/collections";

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
});
