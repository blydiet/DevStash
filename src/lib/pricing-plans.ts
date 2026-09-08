import {
  FREE_TIER_COLLECTION_LIMIT,
  FREE_TIER_ITEM_LIMIT,
  PRO_ONLY_ITEM_TYPES,
} from "@/lib/subscription-limits";

// Shared between the homepage pricing section and the dashboard's /upgrade
// page so the two feature lists can't drift apart. The item/collection
// limits are derived from subscription-limits.ts rather than hardcoded, so
// changing the free-tier caps updates this copy automatically. Image
// uploads are Pro-only (PRO_ONLY_ITEM_TYPES gates both "file" and "image"
// item types), so they're listed under Pro, not Free.
export const FREE_PLAN_FEATURES = [
  `${FREE_TIER_ITEM_LIMIT} items`,
  `${FREE_TIER_COLLECTION_LIMIT} collections`,
  "Basic search",
];

export const PRO_PLAN_FEATURES = [
  "Unlimited items",
  "Unlimited collections",
  "File & image uploads",
  "Custom item types",
  "AI features",
  "Export",
];

// Manually kept in sync with the actual Stripe Dashboard prices behind
// STRIPE_PRICE_ID_MONTHLY / STRIPE_PRICE_ID_YEARLY — not fetched live from
// Stripe. If those prices ever change in the Dashboard, update these too.
export const PRO_MONTHLY_PRICE = "$8";
export const PRO_YEARLY_MONTHLY_EQUIVALENT = "$6";
export const PRO_YEARLY_TOTAL = "$72";
export const PRO_YEARLY_SAVINGS_PERCENT = 25;

// Shown on /upgrade when a Pro-only item page (`/items/file`, `/items/image`)
// redirects a free user here, so the "why am I here" context from the old
// inline ProUpgradeNotice isn't lost. Keyed by PRO_ONLY_ITEM_TYPES itself so
// a future addition to that list fails to compile without matching copy.
export const PRO_FEATURE_UPGRADE_CONTEXT: Record<(typeof PRO_ONLY_ITEM_TYPES)[number], string> = {
  file: "Files are a Pro feature.",
  image: "Images are a Pro feature.",
};
