import { File, FileCode, FileJson, FileSpreadsheet, FileText, type LucideIcon } from "lucide-react";

export type UploadKind = "image" | "file";

export interface FileConstraint {
  maxSizeBytes: number;
  extensions: string[];
  mimeTypes: string[];
}

export const FILE_CONSTRAINTS: Record<UploadKind, FileConstraint> = {
  image: {
    maxSizeBytes: 5 * 1024 * 1024,
    extensions: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    mimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"],
  },
  file: {
    maxSizeBytes: 10 * 1024 * 1024,
    extensions: [".pdf", ".txt", ".md", ".json", ".yaml", ".yml", ".xml", ".csv", ".toml", ".ini"],
    mimeTypes: [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/json",
      "application/x-yaml",
      "text/yaml",
      "application/xml",
      "text/xml",
      "text/csv",
      "application/toml",
    ],
  },
};

// Throws when a mimeType is listed under more than one kind, rather than
// silently resolving to whichever kind happens to iterate first —
// kindForContentType's result drives which size ceiling gets enforced in
// /api/upload/confirm, so a silent overlap would be a real, hard-to-notice
// footgun. A standalone function (rather than an inline IIFE) so the throw
// branch itself is testable against a deliberately-conflicting input, not
// just against the real FILE_CONSTRAINTS, which never conflicts.
export function buildMimeTypeToKindMap(
  constraints: Record<UploadKind, FileConstraint>
): Record<string, UploadKind> {
  const map: Record<string, UploadKind> = {};
  for (const kind of Object.keys(constraints) as UploadKind[]) {
    for (const mimeType of constraints[kind].mimeTypes) {
      const existing = map[mimeType];
      if (existing) {
        throw new Error(`"${mimeType}" is listed under both "${existing}" and "${kind}" in FILE_CONSTRAINTS`);
      }
      map[mimeType] = kind;
    }
  }
  return map;
}

// Built eagerly so a real accidental overlap in FILE_CONSTRAINTS itself
// throws immediately at module load, not just when the test above catches it.
const MIME_TYPE_TO_KIND: Record<string, UploadKind> = buildMimeTypeToKindMap(FILE_CONSTRAINTS);

export function kindForContentType(contentType: string | undefined): UploadKind | null {
  return contentType ? (MIME_TYPE_TO_KIND[contentType] ?? null) : null;
}

export function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot === -1 ? "" : fileName.slice(lastDot).toLowerCase();
}

export function validateFile(
  kind: UploadKind,
  fileName: string,
  mimeType: string,
  sizeBytes: number
): string | null {
  const constraint = FILE_CONSTRAINTS[kind];
  const extension = getExtension(fileName);

  if (!constraint.extensions.includes(extension)) {
    return `Unsupported extension "${extension || "(none)"}". Allowed: ${constraint.extensions.join(", ")}`;
  }

  if (mimeType && !constraint.mimeTypes.includes(mimeType)) {
    return `Unsupported file type "${mimeType}".`;
  }

  if (sizeBytes > constraint.maxSizeBytes) {
    const maxMb = constraint.maxSizeBytes / (1024 * 1024);
    return `File is too large. Max size is ${maxMb}MB.`;
  }

  return null;
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Content-types with a real, checkable byte signature. The remaining allowed
// file-kind types (.txt/.md/.json/.yaml/.xml/.csv/.toml/.ini) are all plain
// text with no distinguishing signature — there is no byte-level way to
// verify those against a claimed type, so this check is partial by design,
// not a complete guarantee that every upload's bytes match its label.
const SIGNATURE_VERIFIABLE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
]);

export function isSignatureVerifiable(mimeType: string): boolean {
  return SIGNATURE_VERIFIABLE_MIME_TYPES.has(mimeType);
}

export const SIGNATURE_CHECK_BYTE_LENGTH = 512;

export function matchesFileSignature(bytes: Uint8Array, mimeType: string): boolean {
  switch (mimeType) {
    case "image/png":
      return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/gif":
      return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46; // "GIF"
    case "image/webp":
      return (
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 && // "RIFF"
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50 // "WEBP"
      );
    case "application/pdf":
      return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // "%PDF"
    case "image/svg+xml": {
      // SVG is XML text, not binary — it has no fixed magic number, so this
      // is a heuristic (an XML-ish prologue/comments then an <svg tag within
      // the fetched window), not a strict signature match like the others.
      const text = new TextDecoder().decode(bytes);
      return /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text);
    }
    default:
      return false;
  }
}

export const EXTENSION_ICONS: Record<string, LucideIcon> = {
  ".pdf": FileText,
  ".txt": FileText,
  ".md": FileText,
  ".json": FileJson,
  ".yaml": FileCode,
  ".yml": FileCode,
  ".xml": FileCode,
  ".csv": FileSpreadsheet,
  ".toml": FileCode,
  ".ini": FileCode,
};

export const DEFAULT_FILE_ICON: LucideIcon = File;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
