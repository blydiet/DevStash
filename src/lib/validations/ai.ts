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

// summarizeDraft has the same "no lookup, raw client input" shape as
// suggestTagsForDraft above — title/content/url are whatever the user has
// typed into the form so far, all optional in the sense that any of them
// may be an empty string (e.g. a link item has no content). Unlike
// suggestTagsForDraft's `content`, these fields get concatenated into one
// prompt string in src/actions/ai.ts *before* that string is truncated to
// 4000 chars for the actual OpenAI call — an unbounded title/url wouldn't
// blow that eventual cap, but it would still mean accepting an arbitrarily
// large request body into the server action itself. Bounded here instead of
// relying solely on the later truncation to do double duty as request-size
// validation.
export const summarizeDraftSchema = z.object({
  title: z.string().max(500),
  content: z.string().max(20000),
  url: z.string().max(2048),
});
