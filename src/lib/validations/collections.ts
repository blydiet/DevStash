import { z } from "zod";

// Same reasoning as src/lib/validations/items.ts: no column-level length
// limits exist in the Prisma schema, and collection creation has no
// rate-limit scope, so these bounds are what actually caps per-row storage
// cost for an authenticated account. name/description are the Collection
// model's only free-text columns (confirmed against prisma/schema.prisma —
// isFavorite is a boolean, covered separately by toggleCollectionFavoriteSchema).
const nameSchema = z.string().trim().min(1, "Name is required").max(200);
const descriptionSchema = z.string().max(10000).nullable();

export const createCollectionSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
});

export const updateCollectionSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
});

export const toggleCollectionFavoriteSchema = z.object({
  isFavorite: z.boolean(),
});
