export type UploadKind = "image" | "file";

interface FileConstraint {
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

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
