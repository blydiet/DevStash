export const FREE_TIER_ITEM_LIMIT = 50;
export const FREE_TIER_COLLECTION_LIMIT = 3;

// Confirmed decision — both "file" and "image" item types are Pro-gated.
// See docs/stripe-integration-plan.md §2. Don't second-guess mid-implementation.
export const PRO_ONLY_ITEM_TYPES = ["file", "image"] as const;

export function isProOnlyItemType(typeName: string): boolean {
  return (PRO_ONLY_ITEM_TYPES as readonly string[]).includes(typeName);
}

// Thrown by items-mutations.ts's createItem when the atomic, in-transaction
// count check (SERIALIZABLE isolation, closing the race isAtItemLimit alone
// can't) rejects a free user's item. The action layer catches this by type
// to surface the upgrade-prompt message.
export class ItemLimitExceededError extends Error {
  constructor() {
    super(`Free plan is limited to ${FREE_TIER_ITEM_LIMIT} items`);
    this.name = "ItemLimitExceededError";
  }
}

// Same shape as ItemLimitExceededError, thrown by collections.ts's
// createCollection.
export class CollectionLimitExceededError extends Error {
  constructor() {
    super(`Free plan is limited to ${FREE_TIER_COLLECTION_LIMIT} collections`);
    this.name = "CollectionLimitExceededError";
  }
}
