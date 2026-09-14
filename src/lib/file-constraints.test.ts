import { describe, expect, it } from "vitest";
import {
  buildMimeTypeToKindMap,
  formatFileSize,
  getExtension,
  isSignatureVerifiable,
  kindForContentType,
  matchesFileSignature,
  sanitizeFileName,
  validateFile,
} from "@/lib/file-constraints";

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

  // Documents existing, previously-untested behavior: the mimeType check is
  // skipped entirely (not "enforced as empty") when mimeType is falsy, since
  // `mimeType && ...` short-circuits. An empty declared mimeType is real,
  // reachable client input at /api/upload/presign, so this pins the bypass
  // down explicitly rather than leaving it undocumented.
  it("does not enforce the mimeType allowlist when mimeType is an empty string", () => {
    expect(validateFile("image", "photo.png", "", 1024)).toBeNull();
  });

  it("still enforces the extension allowlist even when mimeType is empty", () => {
    expect(validateFile("image", "photo.bmp", "", 1024)).toMatch(/extension/i);
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

describe("kindForContentType", () => {
  it('maps a known image mimeType to "image"', () => {
    expect(kindForContentType("image/png")).toBe("image");
  });

  it('maps a known file mimeType to "file"', () => {
    expect(kindForContentType("application/pdf")).toBe("file");
  });

  it("returns null for an unrecognized mimeType", () => {
    expect(kindForContentType("application/octet-stream")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(kindForContentType(undefined)).toBeNull();
  });
});

describe("buildMimeTypeToKindMap", () => {
  it("throws when a mimeType is listed under more than one kind", () => {
    const conflicting = {
      image: { maxSizeBytes: 1, extensions: [".png"], mimeTypes: ["image/png"] },
      file: { maxSizeBytes: 1, extensions: [".dat"], mimeTypes: ["image/png"] },
    };
    expect(() => buildMimeTypeToKindMap(conflicting)).toThrow(
      /"image\/png" is listed under both "image" and "file"/
    );
  });

  it("builds a clean reverse map when there's no overlap", () => {
    const constraints = {
      image: { maxSizeBytes: 1, extensions: [".png"], mimeTypes: ["image/png"] },
      file: { maxSizeBytes: 1, extensions: [".pdf"], mimeTypes: ["application/pdf"] },
    };
    expect(buildMimeTypeToKindMap(constraints)).toEqual({
      "image/png": "image",
      "application/pdf": "file",
    });
  });
});

describe("isSignatureVerifiable", () => {
  it("is true for binary image types and pdf", () => {
    expect(isSignatureVerifiable("image/png")).toBe(true);
    expect(isSignatureVerifiable("application/pdf")).toBe(true);
  });

  it("is false for plain-text file kinds with no distinguishing signature", () => {
    expect(isSignatureVerifiable("text/markdown")).toBe(false);
    expect(isSignatureVerifiable("application/json")).toBe(false);
  });
});

describe("matchesFileSignature", () => {
  it("matches a real PNG signature", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(matchesFileSignature(bytes, "image/png")).toBe(true);
  });

  it("rejects bytes that don't match the claimed PNG signature", () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
    expect(matchesFileSignature(jpegBytes, "image/png")).toBe(false);
  });

  it("matches a real JPEG signature", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(matchesFileSignature(bytes, "image/jpeg")).toBe(true);
  });

  it("matches a real GIF signature", () => {
    const bytes = new TextEncoder().encode("GIF89a");
    expect(matchesFileSignature(bytes, "image/gif")).toBe(true);
  });

  it("matches a real WEBP signature", () => {
    const bytes = new Uint8Array(12);
    bytes.set(new TextEncoder().encode("RIFF"), 0);
    bytes.set(new TextEncoder().encode("WEBP"), 8);
    expect(matchesFileSignature(bytes, "image/webp")).toBe(true);
  });

  it("rejects a RIFF file that isn't WEBP", () => {
    const bytes = new Uint8Array(12);
    bytes.set(new TextEncoder().encode("RIFF"), 0);
    bytes.set(new TextEncoder().encode("WAVE"), 8);
    expect(matchesFileSignature(bytes, "image/webp")).toBe(false);
  });

  it("matches a real PDF signature", () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\n");
    expect(matchesFileSignature(bytes, "application/pdf")).toBe(true);
  });

  it("matches an SVG with an XML prologue before the svg tag", () => {
    const bytes = new TextEncoder().encode(
      '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    );
    expect(matchesFileSignature(bytes, "image/svg+xml")).toBe(true);
  });

  it("matches a bare <svg tag with no XML prologue", () => {
    const bytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(matchesFileSignature(bytes, "image/svg+xml")).toBe(true);
  });

  it("rejects content with no svg tag at all", () => {
    const bytes = new TextEncoder().encode("<html><body>not an svg</body></html>");
    expect(matchesFileSignature(bytes, "image/svg+xml")).toBe(false);
  });

  it("returns false for a mimeType with no signature check defined", () => {
    const bytes = new TextEncoder().encode("just some plain text content");
    expect(matchesFileSignature(bytes, "text/plain")).toBe(false);
  });

  // getR2ObjectHead can hand back fewer bytes than requested — a genuinely
  // tiny or empty uploaded object, or a Range response shorter than
  // SIGNATURE_CHECK_BYTE_LENGTH. Out-of-bounds Uint8Array indexing returns
  // undefined rather than throwing, so every branch must degrade to a clean
  // "no match" on short input instead of crashing or (worse) matching by
  // accident on undefined comparisons.
  it("returns false, without throwing, for an empty byte array", () => {
    const bytes = new Uint8Array(0);
    expect(matchesFileSignature(bytes, "image/png")).toBe(false);
    expect(matchesFileSignature(bytes, "image/webp")).toBe(false);
    expect(matchesFileSignature(bytes, "application/pdf")).toBe(false);
    expect(matchesFileSignature(bytes, "image/svg+xml")).toBe(false);
  });

  it("returns false for a signature truncated shorter than the full magic number", () => {
    const truncatedPng = new Uint8Array([0x89, 0x50]); // real PNG prefix, cut short
    expect(matchesFileSignature(truncatedPng, "image/png")).toBe(false);
  });

  it("returns false for WEBP when RIFF matches but the buffer is too short to reach the WEBP marker", () => {
    const bytes = new Uint8Array(6);
    bytes.set(new TextEncoder().encode("RIFF"), 0);
    expect(matchesFileSignature(bytes, "image/webp")).toBe(false);
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

  it("formats 0 bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("stays in the B unit just below the 1024-byte boundary", () => {
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("crosses into the KB unit exactly at the 1024-byte boundary", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
  });

  it("stays in the KB unit just below the 1MB boundary", () => {
    expect(formatFileSize(1024 * 1024 - 1)).toBe("1024.0 KB");
  });

  it("crosses into the MB unit exactly at the 1MB boundary", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });
});
