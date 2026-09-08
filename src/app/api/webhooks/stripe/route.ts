import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const ACTIVE_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing"];

// Stripe guarantees at-least-once delivery, so the same event can arrive more
// than once (retries after timeouts, etc.) with no dedup by event.id here.
// Safe today because syncSubscription only writes fields to their final
// value (not toggling/incrementing), so replaying the same event is a no-op —
// this reasoning breaks if a non-idempotent side effect (e.g. sending an
// email) is ever added to this handler; add real dedup by event.id first.
async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  // As of API version 2025-03-31.basil (stripe-node v18+), current_period_end
  // lives on each SubscriptionItem, not on the Subscription object itself.
  const item = subscription.items.data[0];

  const { count } = await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      isPro: ACTIVE_STATUSES.includes(subscription.status),
      stripeSubscriptionId: subscription.id,
      stripePriceId: item?.price.id ?? null,
      stripeCurrentPeriodEnd: item?.current_period_end
        ? new Date(item.current_period_end * 1000)
        : null,
    },
  });

  if (count === 0) {
    // A real, non-transient-looking desync (e.g. the Stripe customer was
    // created but the stripeCustomerId write never landed) — throw instead
    // of just logging so the handler returns a failure status below. That
    // makes Stripe retry this event automatically and surfaces it as a
    // failed delivery in the Dashboard, instead of silently no-op'ing
    // "received: true" forever.
    throw new Error(`No user found for Stripe customer ${customerId} (subscription ${subscription.id})`);
  }
}

// This route is intentionally excluded from src/proxy.ts's matcher (which
// only covers /dashboard, /profile, /settings, /favorites, /items,
// /collections) — Next's middleware matcher gates whether it runs at all, so
// nothing reads or transforms the body before request.text() below sees it.
export async function POST(request: Request) {
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        if (checkoutSession.mode === "subscription" && checkoutSession.subscription) {
          // subscription is normally a plain id string, but arrives as an
          // already-expanded object if the webhook endpoint's event payload
          // expansion is ever configured in the Dashboard — handle both so
          // that configuration change can't silently skip this sync.
          const subscription =
            typeof checkoutSession.subscription === "string"
              ? await stripe.subscriptions.retrieve(checkoutSession.subscription)
              : checkoutSession.subscription;
          await syncSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`Failed to process Stripe webhook event ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
