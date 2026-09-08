import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/user";
import { getItemStats } from "@/lib/db/item-metadata";
import { getCollectionStats } from "@/lib/db/collections";
import { FREE_TIER_COLLECTION_LIMIT, FREE_TIER_ITEM_LIMIT } from "@/lib/subscription-limits";

// Thrown when the session's user id no longer has a matching User row — the
// session can outlive the row (JWT sessions are stateless, so a stale tab can
// still hold a valid session after deleteAccount runs elsewhere). The message
// matches getCurrentUserId's "no session at all" error so existing
// string-matched auth-failure handling (e.g. settings/page.tsx) covers this
// case too, while the distinct class still lets a future caller tell the two
// cases apart via instanceof if that distinction is ever needed.
export class AccountNotFoundError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "AccountNotFoundError";
  }
}

export interface BillingInfo {
  isPro: boolean;
  currentPeriodEnd: Date | null;
}

export async function getBillingInfo(): Promise<BillingInfo> {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPro: true, stripeCurrentPeriodEnd: true },
  });

  if (!user) {
    throw new AccountNotFoundError();
  }

  return { isPro: user.isPro, currentPeriodEnd: user.stripeCurrentPeriodEnd };
}

// Takes the Stripe API call as an injected function rather than importing
// @/lib/stripe directly, keeping this file — like the rest of src/lib/db/ —
// a thin, mockable Prisma boundary. The real stripe.customers.create call
// lives in Phase 2's src/actions/billing.ts.
export async function getOrCreateStripeCustomerId(
  userId: string,
  email: string,
  createCustomer: (email: string, userId: string) => Promise<string>,
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user) {
    throw new AccountNotFoundError();
  }

  if (user.stripeCustomerId) return user.stripeCustomerId;

  // Residual, accepted limitation: two concurrent first-time checkouts can
  // both reach here and both successfully call createCustomer before either
  // persists — the updateMany guard below prevents DB corruption (both calls
  // converge on one winning id), but the loser's Stripe customer object is
  // still created and now has nothing pointing at it. Low severity (an
  // orphaned Stripe customer has no side effects beyond Dashboard clutter) —
  // closing it fully would need a lock held across the Stripe API call
  // itself (e.g. a Postgres advisory lock keyed by userId), which isn't
  // worth the added complexity for a harmless orphan.
  try {
    const customerId = await createCustomer(email, userId);

    // Guard against a concurrent call (e.g. a double-click or two tabs)
    // having already persisted a different stripeCustomerId between the read
    // above and this write — only persist ours if the column is still null,
    // and defer to whichever id actually won the race so both calls converge
    // on one value.
    const { count } = await prisma.user.updateMany({
      where: { id: userId, stripeCustomerId: null },
      data: { stripeCustomerId: customerId },
    });

    if (count === 0) {
      const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });
      return current?.stripeCustomerId ?? customerId;
    }

    return customerId;
  } catch (err) {
    console.error(`Failed to create/persist Stripe customer for user ${userId}:`, err);
    throw err;
  }
}

// Advisory only, not the enforcement mechanism: this reads the count
// separately from any write, so it's usable for e.g. a "you're near your
// limit" UI hint, but createItem/createCollection enforce the real cap
// atomically (in the same transaction as the insert) rather than calling
// this first — see items-mutations.ts/collections.ts. Lives here rather than
// the pure src/lib/subscription-limits.ts because it touches the DB (via
// getItemStats), matching this codebase's src/lib/* (pure) vs
// src/lib/db/* (DB-touching) split.
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
