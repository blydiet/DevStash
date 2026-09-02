import { describe, expect, it } from "vitest";
import { editorPreferencesPartialSchema, editorPreferencesSchema } from "@/lib/validations/editor-preferences";

const valid = { fontSize: 14, tabSize: 4, wordWrap: true, minimap: false, theme: "monokai" as const };

describe("editorPreferencesSchema", () => {
  it("accepts a fully valid object", () => {
    expect(editorPreferencesSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects null", () => {
    expect(editorPreferencesSchema.safeParse(null).success).toBe(false);
  });

  it("rejects a font size outside the allowed set with a distinct message", () => {
    const result = editorPreferencesSchema.safeParse({ ...valid, fontSize: 999 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid font size");
    }
  });

  it("rejects a tab size outside the allowed set with a distinct message", () => {
    const result = editorPreferencesSchema.safeParse({ ...valid, tabSize: 3 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid tab size");
    }
  });

  it("rejects a theme outside the allowed set", () => {
    const result = editorPreferencesSchema.safeParse({ ...valid, theme: "solarized" });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = editorPreferencesSchema.safeParse({ fontSize: 14 });
    expect(result.success).toBe(false);
  });

  it("rejects a stringified font size rather than coercing it", () => {
    // The Select control sends strings (`Number(value)` happens client-side before this
    // schema ever sees it) — the schema itself must not silently coerce "14" to 14, or a
    // future caller that skips that conversion would pass validation with the wrong type
    // stored in the JSON column.
    const result = editorPreferencesSchema.safeParse({ ...valid, fontSize: "14" });
    expect(result.success).toBe(false);
  });

  it("strips unknown keys rather than storing them", () => {
    const result = editorPreferencesSchema.safeParse({ ...valid, malicious: "x" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("malicious" in result.data).toBe(false);
    }
  });
});

describe("editorPreferencesPartialSchema", () => {
  it("accepts an empty object", () => {
    expect(editorPreferencesPartialSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a single valid field", () => {
    expect(editorPreferencesPartialSchema.safeParse({ theme: "github-dark" }).success).toBe(true);
  });

  it("rejects a single invalid field", () => {
    const result = editorPreferencesPartialSchema.safeParse({ fontSize: 999 });
    expect(result.success).toBe(false);
  });

  it("strips unknown keys rather than storing them", () => {
    const result = editorPreferencesPartialSchema.safeParse({ theme: "monokai", malicious: "x" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("malicious" in result.data).toBe(false);
    }
  });

  it("keeps an explicit-undefined field as its own key rather than stripping it", () => {
    // Zod's .partial() does NOT drop an explicit `{ theme: undefined }` the way an
    // omitted key would be dropped — the parsed result still has `theme` as an own key,
    // just with an undefined value. That means `{ ...current, ...partialResult.data }`
    // in the db layer would overwrite `current.theme` with undefined if this ever
    // reached it unfiltered, so the db layer filters undefined values before merging
    // (see editor-preferences.test.ts's "ignores an explicit undefined" case).
    const result = editorPreferencesPartialSchema.safeParse({ theme: undefined });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("theme" in result.data).toBe(true);
      expect(result.data.theme).toBeUndefined();
    }
  });
});
