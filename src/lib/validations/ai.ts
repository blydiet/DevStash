import { z } from "zod";

// suggestTags(itemId) isn't validated here — itemId follows this codebase's
// existing convention (updateItem/deleteItem/toggleItemFavorite in
// src/actions/items.ts) of relying on getItemDetail's ownership-scoped
// lookup rather than a Zod check. suggestTagsForDraft has no such lookup —
// it operates on raw, unscoped client input — so it needs its own schema.
export const suggestTagsForDraftSchema = z.object({
  content: z.string(),
  existingTags: z.array(z.string().trim().min(1)),
});
