import { getItemStats } from "@/lib/db/item-metadata";
import { getCollectionStats } from "@/lib/db/collections";

export const FREE_TIER_ITEM_LIMIT = 50;
export const FREE_TIER_COLLECTION_LIMIT = 3;

// Confirmed decision — both "file" and "image" item types are Pro-gated.
// See docs/stripe-integration-plan.md §2. Don't second-guess mid-implementation.
export const PRO_ONLY_ITEM_TYPES = ["file", "image"] as const;

export function isProOnlyItemType(typeName: string): boolean {
  return (PRO_ONLY_ITEM_TYPES as readonly string[]).includes(typeName);
}

// These are advisory checks, not atomic guarantees: the count read here and
// the eventual insert at the call site (createItem/createCollection) aren't
// in the same transaction, so two concurrent creates can both pass the check
// before either is persisted, landing a free user one or two items/
// collections over the cap. Acceptable for a soft monetization limit (not a
// security boundary); closing the gap fully would require making the count
// check and the write atomic at the call site, which is out of scope here.
export async function isAtItemLimit(isPro: boolean): Promise<boolean> {
  if (isPro) return false;
  const { total } = await getItemStats();
  return total >= FREE_TIER_ITEM_LIMIT;
}

export async function isAtCollectionLimit(isPro: boolean): Promise<boolean> {
  if (isPro) return false;
  const { total } = await getCollectionStats();
  return total >= FREE_TIER_COLLECTION_LIMIT;
}
