"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/app-url";
import { getOrCreateStripeCustomerId } from "@/lib/db/subscription";
import { billingPeriodSchema } from "@/lib/validations/billing";
import type { CreateCheckoutSessionResult, CreatePortalSessionResult } from "@/types/billing";

// Read at call time rather than cached in a module-level object: process.env
// is otherwise captured once when this module first loads, which makes the
// "missing price id" case unreliable to exercise per-test.
function getPriceId(billingPeriod: "monthly" | "yearly"): string | undefined {
  return billingPeriod === "monthly"
    ? process.env.STRIPE_PRICE_ID_MONTHLY
    : process.env.STRIPE_PRICE_ID_YEARLY;
}

export async function createCheckoutSession(
  billingPeriod: "monthly" | "yearly"
): Promise<CreateCheckoutSessionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = billingPeriodSchema.safeParse(billingPeriod);

  if (!parsed.success) {
    return { success: false, error: "Invalid billing period" };
  }

  const priceId = getPriceId(parsed.data);

  if (!priceId) {
    console.error(`Missing Stripe price id env var for billing period "${parsed.data}"`);
    return { success: false, error: "Billing is not configured" };
  }

  // Source the email from the DB rather than session.user.email: the session
  // callback falls back to "" when the JWT has no email claim, and an
  // empty-string email passed to stripe.customers.create() risks silently
  // creating a customer unreachable for receipts/dunning. User.email is a
  // required, unique DB column, so this is the trustworthy source.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });

  if (!dbUser) {
    return { success: false, error: "Not authenticated" };
  }

  let checkoutUrl: string | null;
  try {
    const customerId = await getOrCreateStripeCustomerId(
      session.user.id,
      dbUser.email,
      async (email, userId) => {
        const customer = await stripe.customers.create({ email, metadata: { userId } });
        return customer.id;
      }
    );

    const appUrl = getAppUrl();
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?checkout=success`,
      cancel_url: `${appUrl}/settings?checkout=cancelled`,
      client_reference_id: session.user.id,
      subscription_data: { metadata: { userId: session.user.id } },
    });

    checkoutUrl = checkoutSession.url;
  } catch (err) {
    console.error("Failed to create Stripe Checkout session:", err);
    return { success: false, error: "Failed to start checkout" };
  }

  if (!checkoutUrl) {
    return { success: false, error: "Failed to start checkout" };
  }

  // Outside the try/catch on purpose — redirect() throws a special
  // NEXT_REDIRECT error internally that a surrounding catch would swallow.
  redirect(checkoutUrl);
}

export async function createBillingPortalSession(): Promise<CreatePortalSessionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!user.stripeCustomerId) {
    return { success: false, error: "No billing account found" };
  }

  let portalUrl: string;
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${getAppUrl()}/settings`,
    });
    portalUrl = portalSession.url;
  } catch (err) {
    console.error("Failed to create Stripe Billing Portal session:", err);
    return { success: false, error: "Failed to open billing portal" };
  }

  redirect(portalUrl);
}
