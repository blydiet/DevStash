import { z } from "zod";

export const updateItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().nullable(),
  content: z.string().nullable(),
  url: z.union([z.url(), z.null()]),
  language: z.string().nullable(),
  tags: z.array(z.string().trim().min(1)),
});

export const createItemSchema = z
  .object({
    type: z.enum(["snippet", "prompt", "command", "note", "file", "image", "link"]),
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().nullable(),
    content: z.string().nullable(),
    url: z.union([z.url(), z.null()]),
    language: z.string().nullable(),
    fileUrl: z.union([z.url(), z.null()]).default(null),
    fileName: z.string().nullable().default(null),
    fileSize: z.number().int().positive().nullable().default(null),
    tags: z.array(z.string().trim().min(1)),
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
