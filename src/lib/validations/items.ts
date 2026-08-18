import { z } from "zod";

export const updateItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().nullable(),
  content: z.string().nullable(),
  url: z.union([z.url(), z.null()]),
  language: z.string().nullable(),
  tags: z.array(z.string().trim().min(1)),
});
