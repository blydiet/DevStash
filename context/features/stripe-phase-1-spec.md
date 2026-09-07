# Stripe Integration — Phase 1: Core Infrastructure

## Overview

Lay the foundational plumbing for DevStash Pro billing ($8/mo / $72/yr): schema fields, the Stripe client, free-tier limit logic, session `isPro` syncing, and supporting types/validation. Nothing in this phase calls the live Stripe API or needs the Stripe Dashboard configured — it's all unit-testable in isolation. Checkout/webhook/UI work is Phase 2 (`context/features/stripe-phase-2-spec.md`).

Full reference: `@docs/stripe-integration-plan.md` (§5.1–5.6, §6.1–6.3) — this spec is the checklist; that doc has the exact code, rationale, and non-obvious details (e.g. why `isPro` syncs on every `jwt()` call, not just sign-in).

## Requirements

### Schema

- Add `stripePriceId String?` and `stripeCurrentPeriodEnd DateTime?` to `User` in `prisma/schema.prisma` (alongside the existing `isPro`/`stripeCustomerId`/`stripeSubscriptionId`).
- Run `npx prisma migrate dev --name add_stripe_subscription_fields` — **not** `db push`. Verify with `npx prisma migrate status` before moving on.

### Dependency

- `npm install stripe`

### Stripe client

- `src/lib/stripe.ts` — singleton Stripe client, same throw-if-unset pattern as `src/lib/prisma.ts`. Omit `apiVersion` (let the installed SDK pin its own default rather than hardcoding a date string that goes stale).

### Free-tier limits module (unit tests required)

- `src/lib/subscription-limits.ts`:
  - `FREE_TIER_ITEM_LIMIT = 50`, `FREE_TIER_COLLECTION_LIMIT = 3`
  - `PRO_ONLY_ITEM_TYPES = ["file", "image"] as const` (both types Pro-gated — confirmed decision, see plan §2)
  - `isProOnlyItemType(typeName)`
  - `isAtItemLimit(isPro)` — reuses the existing `getItemStats()` (`src/lib/db/item-metadata.ts`), doesn't add a new count query
  - `isAtCollectionLimit(isPro)` — reuses the existing `getCollectionStats()` (`src/lib/db/collections.ts`)
- `src/lib/subscription-limits.test.ts`:
  - `isAtItemLimit`/`isAtCollectionLimit`: `isPro: true` always `false`; below/at/above threshold for `isPro: false` (mock `getItemStats`/`getCollectionStats`)
  - `isProOnlyItemType`: both a gated and an ungated type name

### Billing DB helpers (unit tests required)

- `src/lib/db/subscription.ts`:
  - `getBillingInfo()` — `{ isPro, currentPeriodEnd }` for the current user, scoped via `getCurrentUserId()` like every other `db/*` function
  - `getOrCreateStripeCustomerId(userId, email, createCustomer)` — takes the actual Stripe API call as an injected function so this file stays a thin, mockable Prisma boundary (no `@/lib/stripe` import here); the real `stripe.customers.create` call lives in Phase 2's `src/actions/billing.ts`
- `src/lib/db/subscription.test.ts`:
  - `getBillingInfo` mapping + session-failure propagation (mock Prisma, match `user.test.ts`'s existing style)
  - `getOrCreateStripeCustomerId`'s two branches: existing id returned as-is (injected `createCustomer` never called); missing id calls it once and persists the result

### Supporting types & validation

- `src/lib/validations/billing.ts` — `billingPeriodSchema = z.enum(["monthly", "yearly"])`
- `src/types/billing.ts` — `CreateCheckoutSessionResult { success, error? }`, `CreatePortalSessionResult` (alias)

### Session `isPro` sync

- `src/types/next-auth.d.ts` — add `isPro: boolean` to both the `Session.user` and `JWT` module augmentations.
- `src/auth.ts` — make the `jwt` callback `async` and re-query `isPro` from the DB on **every** call (not just sign-in), so a webhook-driven change lands on the user's next request instead of their next login. Add `isPro` to the hand-built `session` callback's return object (keep the existing no-spread discipline — this project explicitly avoids spreading raw DB/session objects after a prior data-leak fix).

### Environment variables

- `.env.example`: fix the `STRIPE_PREICE_ID_MONTHLY`/`STRIPE_PREICE_ID_YEARLY` typo → `STRIPE_PRICE_ID_MONTHLY`/`STRIPE_PRICE_ID_YEARLY`; add `STRIPE_WEBHOOK_SECRET` (value filled in during Phase 2's Dashboard setup). `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` are already present and correctly spelled.

## Notes

- `PRO_ONLY_ITEM_TYPES` including `"image"` is a confirmed decision (not left open) — see the plan's §2 discussion for why, and don't second-guess it mid-implementation.
- The `jwt` callback's extra DB query on every `auth()` call is a deliberate, accepted cost — it's what makes `session.user.isPro` trustworthy enough for Phase 2's gating checks to read directly without a second query.
- No Stripe Dashboard account setup, webhook, or live API calls are needed to complete or test this phase — everything here is either pure logic or mocked in tests. Don't jump ahead to `src/actions/billing.ts` or the webhook route; that's explicitly Phase 2.
