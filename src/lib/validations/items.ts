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
    type: z.enum(["snippet", "prompt", "command", "note", "link"]),
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().nullable(),
    content: z.string().nullable(),
    url: z.union([z.url(), z.null()]),
    language: z.string().nullable(),
    tags: z.array(z.string().trim().min(1)),
  })
  .refine((data) => data.type !== "link" || data.url !== null, {
    message: "URL is required",
    path: ["url"],
  });
