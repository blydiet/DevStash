import { z } from "zod";
import { buildPublicUrl } from "@/lib/r2";
import { FILE_CONSTRAINTS } from "@/lib/file-constraints";

// No column-level length limits exist in the Prisma schema (plain String/text
// columns), and neither items nor collections have any create-rate-limit
// scope, so these Zod bounds are the only thing standing between an
// authenticated account (Pro accounts have no item/collection count limit at
// all) and unbounded per-row storage cost. Sized generously for real usage
// (content can legitimately be a full pasted file) rather than tightly.
//
// updateItemSchema revalidates the *whole* item on every edit (this
// project's established full-object-replace convention), not just the
// field being changed. Tightening any bound here — or fileUrl's
// isOwnedR2Url check below, if R2_PUBLIC_URL ever changes — can silently
// freeze existing rows that already violate the new rule: any future edit
// to that row, on any field, fails validation before it reaches the DB.
// Audit real data against new/changed bounds before shipping them (verified
// clean via direct SQL against the dev DB on 2026-09-13 for the bounds
// below); don't assume existing rows already conform.
const titleSchema = z.string().trim().min(1, "Title is required").max(200);
const descriptionSchema = z.string().max(10000).nullable();
const contentSchema = z.string().max(100000).nullable();
// protocol restricted to http(s) — without it, z.url() happily accepts
// javascript:/data: URIs, which ItemDrawerViewContent renders as a real
// clickable <a href>.
const urlSchema = z.union([z.url({ protocol: /^https?$/ }).max(2048), z.null()]);
const languageSchema = z.string().max(50).nullable();
const fileNameSchema = z.string().max(255).nullable().default(null);
const tagsSchema = z.array(z.string().trim().min(1).max(50)).max(20);
// Collection ids are cuids (~25 chars); 100 leaves headroom without
// leaving the field effectively unbounded like a bare z.string() would.
const collectionIdsSchema = z.array(z.string().max(100)).max(50);
// The larger of the two FILE_CONSTRAINTS ceilings (file: 10MB, image: 5MB).
// fileSize is never cross-checked against the real R2 object, so this is
// NOT a guard against a claimed size that doesn't match the actual uploaded
// bytes (a client can already pair a real, valid fileUrl with a fabricated
// fileSize, and this bound does nothing to catch that mismatch). It's only
// a plausibility ceiling on the claimed number itself, cheap insurance
// against a garbage/huge value reaching whatever later does math with it
// (e.g. formatFileSize's display string).
const MAX_CLAIMED_FILE_SIZE = Math.max(
  FILE_CONSTRAINTS.file.maxSizeBytes,
  FILE_CONSTRAINTS.image.maxSizeBytes
);
const fileSizeSchema = z.number().int().positive().max(MAX_CLAIMED_FILE_SIZE).nullable().default(null);
// Beyond being a well-formed https URL, fileUrl must actually resolve to this
// app's own R2 public origin — otherwise a file/image item could claim a
// fileUrl pointing anywhere on the internet instead of provably being
// something that went through the real signed /api/upload flow. Parses both
// URLs and compares origin + pathname prefix (matching getSafeRedirectUrl's
// approach in src/lib/safe-redirect.ts) rather than a raw string prefix
// match, which URL syntax quirks (userinfo, trailing-dot hosts, etc.) can
// defeat.
function isOwnedR2Url(url: string): boolean {
  let base: URL;
  try {
    base = new URL(buildPublicUrl(""));
  } catch {
    return false;
  }
  try {
    const resolved = new URL(url);
    return resolved.origin === base.origin && resolved.pathname.startsWith(base.pathname);
  } catch {
    return false;
  }
}
const fileUrlSchema = z.union([
  z
    .url({ protocol: /^https?$/ })
    .max(2048)
    .refine(isOwnedR2Url, { message: "fileUrl must point to this app's file storage" }),
  z.null(),
]);

export const updateItemSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema,
    content: contentSchema,
    url: urlSchema,
    language: languageSchema,
    fileUrl: fileUrlSchema.default(null),
    fileName: fileNameSchema,
    fileSize: fileSizeSchema,
    tags: tagsSchema,
    collectionIds: collectionIdsSchema,
  })
  .refine((data) => (data.fileUrl === null) === (data.fileName === null), {
    message: "fileUrl and fileName must be provided together",
    path: ["fileName"],
  });

export const createItemSchema = z
  .object({
    type: z.enum(["snippet", "prompt", "command", "note", "file", "image", "link"]),
    title: titleSchema,
    description: descriptionSchema,
    content: contentSchema,
    url: urlSchema,
    language: languageSchema,
    fileUrl: fileUrlSchema.default(null),
    fileName: fileNameSchema,
    fileSize: fileSizeSchema,
    tags: tagsSchema,
    collectionIds: collectionIdsSchema,
  })
  .refine((data) => data.type !== "link" || data.url !== null, {
    message: "URL is required",
    path: ["url"],
  })
  .refine((data) => (data.type !== "file" && data.type !== "image") || data.fileUrl !== null, {
    message: "A file upload is required",
    path: ["fileUrl"],
  })
  .refine((data) => data.fileUrl === null || data.fileName !== null, {
    message: "A file name is required",
    path: ["fileName"],
  });
