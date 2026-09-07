# Stripe Integration — Phase 2: Integration & UI

## Overview

Wire up live Stripe Checkout/Billing Portal, the subscription webhook, free-tier enforcement, and the Settings UI. Builds directly on Phase 1 (`context/features/stripe-phase-1-spec.md`) — `session.user.isPro`, `src/lib/subscription-limits.ts`, and `src/lib/db/subscription.ts` must already exist and be merged before starting this phase.

This phase requires a real Stripe test-mode account (Dashboard-configured product/prices/webhook) and the **Stripe CLI** (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`) for local webhook testing — there's no way to verify `checkout.session.completed`/`customer.subscription.updated` handling without it.

Full reference: `@docs/stripe-integration-plan.md` (§5.7–5.9, §6.4–6.9, §7, §8, §9) — this spec is the checklist; that doc has the exact code, the raw-body/signature-verification details, and the `current_period_end`-moved-to-`SubscriptionItem` API-version gotcha.

## Requirements

### Stripe Dashboard setup (do this first)

- Create the "DevStash Pro" product with two recurring prices: $8/mo monthly, $72/yr yearly. Put the two `price_...` ids into `STRIPE_PRICE_ID_MONTHLY`/`STRIPE_PRICE_ID_YEARLY`.
- Enable the Customer Portal (at minimum: cancel subscription, update payment method).
- Create the webhook endpoint (Dashboard, for production) sending `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`; copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
- For local dev, run `stripe login` then `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — use **that** session's separate `whsec_...` in your local `.env` (it differs from the Dashboard endpoint's secret).

### Checkout & Billing Portal (Server Actions)

- `src/actions/billing.ts`:
  - `createCheckoutSession(billingPeriod: "monthly" | "yearly")` — validates the period, resolves the price id, gets-or-creates the Stripe customer (via Phase 1's `getOrCreateStripeCustomerId`, injecting a real `stripe.customers.create` call here), creates a subscription-mode Checkout Session (`client_reference_id` + `subscription_data.metadata.userId` both set, `success_url`/`cancel_url` built from `getAppUrl()` — never the `Host` header), then `redirect()`s to it.
  - `createBillingPortalSession()` — looks up the user's `stripeCustomerId`, creates a Billing Portal session (`return_url` via `getAppUrl()`), `redirect()`s to it.
  - Both: `redirect()` calls sit **outside** any try/catch (it throws internally; a surrounding catch would swallow it).

### Webhook handler (API route)

- `src/app/api/webhooks/stripe/route.ts`:
  - Reads the raw body via `await request.text()` (no special Next.js config needed — App Router route handlers don't auto-parse).
  - Verifies `stripe-signature` via `stripe.webhooks.constructEvent`; `400` on failure.
  - Handles `checkout.session.completed` (subscription mode only — retrieve the subscription, then sync), `customer.subscription.updated`, `customer.subscription.deleted`.
  - Single `syncSubscription()` helper writes `isPro`/`stripeSubscriptionId`/`stripePriceId`/`stripeCurrentPeriodEnd` via `prisma.user.updateMany({ where: { stripeCustomerId } })` — idempotent by construction (fields set to final values, not toggled), so no dedup table needed.
  - `isPro` is derived from `subscription.status` (`active`/`trialing` → true, everything else including `canceled`/`past_due` → false) — this alone handles the full cancel and failed-payment-dunning lifecycle with no separate `invoice.payment_failed` handling.
  - No rate limiting on this route (signature-authenticated, not user-facing).

### Feature gating enforcement

- `src/actions/items.ts` (`createItem` only, not `updateItem`): reject with an upgrade-prompt error if `isProOnlyItemType(type) && !session.user.isPro`, and separately if `isAtItemLimit(session.user.isPro)`.
- `src/app/api/collections/route.ts` (`POST`): reject with `403` if `isAtCollectionLimit(session.user.isPro)`, checked right after the auth guard.
- `src/app/api/upload/route.ts`: reject with `403` if `isProOnlyItemType(kind) && !session.user.isPro` — insert this check right after the existing file-validation block (needs `kind`, which is parsed from `formData` partway through the handler — don't check before it's available).

### Settings UI

- `src/components/settings/BillingSettings.tsx` — async server component, same `Card` sizing/try-catch-to-destructive-text pattern as its settings-page siblings (`AccountActions`, `EditorPreferencesSettings`). Shows current plan badge (Free/Pro); Pro users see "renews on…" (from `stripeCurrentPeriodEnd`) + a "Manage subscription" button (`<form action={createBillingPortalSession}>`); Free users see two upgrade buttons bound to `createCheckoutSession` via `.bind(null, "monthly" | "yearly")`.
- `src/app/settings/page.tsx` — render `<BillingSettings />` between `<AccountActions>` and `<EditorPreferencesSettings>`.

## Testing Checklist

Route handlers (webhook, upload, collections) aren't covered by Vitest per this project's convention — verify all of the following live, with `stripe listen` running:

- [ ] Monthly upgrade: Checkout with test card `4242 4242 4242 4242` → lands back on `/settings?checkout=success` → `checkout.session.completed` fires → `User.isPro`/`stripeSubscriptionId`/`stripePriceId`/`stripeCurrentPeriodEnd` all correct (check via Neon MCP, **development** branch) → Billing card shows "Pro" after a reload (no re-login needed — this is what Phase 1's `jwt` re-sync exists to guarantee).
- [ ] Repeat for yearly.
- [ ] Manage subscription → cancel in the real Billing Portal → `customer.subscription.deleted`/`.updated(canceled)` fires → `isPro` flips back to `false` → Billing card shows "Free" after reload.
- [ ] Item limit: a throwaway account at exactly 50 items gets rejected on the 51st with the upgrade message; succeeds once Pro.
- [ ] Collection limit: same shape, at 3.
- [ ] Upload gating: a free account's file/image upload returns the 403 upgrade message; a Pro account's succeeds.
- [ ] Webhook signature rejection: `curl` the endpoint with a garbage `stripe-signature` → `400`, no DB write.
- [ ] Webhook idempotency: resend an already-processed event (`stripe events resend <id>`) → no error, DB state unchanged (not duplicated/corrupted).
- [ ] `npm run test`, `npm run lint`, `npm run build`, `tsc --noEmit` all pass.
- [ ] All throwaway test users/subscriptions cleaned up in both the dev Neon DB and Stripe test-mode dashboard afterward.

## Notes

- Don't add unit tests for the webhook route or the modified `collections`/`upload` routes — matches this project's existing convention (neither currently has one) of covering route handlers via the manual checklist instead.
- `Sidebar.tsx` already badges both `file` and `image` as "Pro" — no change needed there, since Phase 1 confirmed `PRO_ONLY_ITEM_TYPES` includes both. Skip §6.8/§6.9 of the plan doc (the Option A path) entirely.
- Don't build custom item types, AI features, or export gating in this phase — none of those exist in the codebase yet, so there's nothing to gate. The hook point for each, when built, is just `session.user.isPro`.
