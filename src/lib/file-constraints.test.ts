import { describe, expect, it } from "vitest";
import { formatFileSize, getExtension, sanitizeFileName, validateFile } from "@/lib/file-constraints";

describe("getExtension", () => {
  it("returns the lowercased extension including the dot", () => {
    expect(getExtension("Photo.PNG")).toBe(".png");
  });

  it("returns an empty string when there is no extension", () => {
    expect(getExtension("README")).toBe("");
  });
});

describe("validateFile", () => {
  it("accepts a valid image", () => {
    expect(validateFile("image", "photo.png", "image/png", 1024)).toBeNull();
  });

  it("accepts a valid file", () => {
    expect(validateFile("file", "notes.md", "text/markdown", 1024)).toBeNull();
  });

  it("rejects an unsupported extension", () => {
    expect(validateFile("image", "photo.bmp", "image/bmp", 1024)).toMatch(/extension/i);
  });

  it("rejects a mismatched mime type for an allowed extension", () => {
    expect(validateFile("image", "photo.png", "application/octet-stream", 1024)).toMatch(
      /file type/i
    );
  });

  it("rejects a file over the size limit for its kind", () => {
    const oversized = 6 * 1024 * 1024;
    expect(validateFile("image", "photo.png", "image/png", oversized)).toMatch(/too large/i);
  });

  it("allows a file kind up to its own larger limit", () => {
    const sixMb = 6 * 1024 * 1024;
    expect(validateFile("file", "doc.pdf", "application/pdf", sixMb)).toBeNull();
  });
});

describe("sanitizeFileName", () => {
  it("replaces unsafe characters with underscores", () => {
    expect(sanitizeFileName("../../etc/passwd.txt")).toBe(".._.._etc_passwd.txt");
  });

  it("leaves a normal file name untouched", () => {
    expect(sanitizeFileName("resume-2026.pdf")).toBe("resume-2026.pdf");
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
