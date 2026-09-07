import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/user";

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
