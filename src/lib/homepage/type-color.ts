import { ITEM_TYPES } from "@/lib/item-types";

// Matches --hp-text-tertiary in homepage.css — a neutral, non-brand-colored
// fallback for "type not found" rather than any one real item type's color.
export const FALLBACK_TYPE_COLOR = "#6a6a75";

export function typeColor(value: string) {
  return ITEM_TYPES.find((t) => t.value === value)?.color ?? FALLBACK_TYPE_COLOR;
}
