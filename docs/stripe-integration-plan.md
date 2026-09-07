# Stripe Subscription Integration Plan

DevStash Pro: **$8/mo** or **$72/yr**, unlocking unlimited items/collections, file uploads, custom item types, AI features, and export (per `context/project-overview.md`'s monetization table). This plan covers the billing infrastructure and the two numeric free-tier limits; it does **not** build custom item types, AI features, or export — those don't exist in the codebase yet, so there's nothing to gate. The plan notes where an `isPro` check would go once they're built.

---

## 1. Current State Analysis

### Schema (`prisma/schema.prisma`)

`User` already has the three fields the original data-model draft called for:

```prisma
isPro                Boolean  @default(false)
stripeCustomerId     String?
stripeSubscriptionId String?
```

Nothing else references Stripe anywhere in `src/` — confirmed via a full-codebase grep for `stripe`/`isPro`; the only hits are the schema itself and the generated Prisma client. This is a from-scratch integration.

**Gap:** there's no field to distinguish monthly vs. yearly, and no field to know when the current billing period ends (needed to display "renews on X" and to reason about cancel-at-period-end). Recommend adding two fields — see §5.

### Auth (`src/auth.ts`, `src/types/next-auth.d.ts`)

- `session: { strategy: "jwt" }` (required since the Credentials provider was added — DB sessions can't be created from a credentials sign-in). This matters a lot for this feature: with JWT strategy, the `jwt()` callback runs on **every** `auth()` call, not just at sign-in, giving us a natural hook to keep `isPro` fresh.
- `Session.user` currently exposes only `{ id, name, email, image }` — explicitly hand-built in both the `jwt`/`session` callbacks (no spreading, a deliberate anti-leak pattern from an earlier security fix). `isPro` needs to be added to both the type augmentation and both callbacks the same way.
- The research prompt's own notes document the exact fix needed: don't rely on `trigger === "update"` (unreliable for a webhook-driven external change); instead have the `jwt` callback re-query `isPro` from the DB on every call. This project's JWT-strategy setup makes that workaround directly applicable — see §6.

### Data access patterns

- `getCurrentUserId()` (`src/lib/db/user.ts`) throws `"Not authenticated"` if there's no session — the standard guard reused by every `db/*` function.
- Every mutation is scoped with `getCurrentUserId()` inside the DB layer itself, not re-derived in the route/action — Stripe helpers should follow the same shape.
- No subscription/payment code exists to build on.

### Existing server actions vs. API routes split (relevant precedent)

This codebase has a real, already-established split, not a strict rule:

| Domain | Mutated via | Precedent |
|---|---|---|
| Items | Server Actions (`src/actions/items.ts`) | `createItem`, `updateItem`, `deleteItem`, `toggleItemFavorite`, `toggleItemPin` |
| Collections | Client-facing API routes (`src/app/api/collections/`, `.../[id]/`) | `POST/GET /api/collections`, `PATCH/DELETE /api/collections/[id]` |
| Uploads | API route | `POST /api/upload` — coding standard explicitly calls out "third-party integrations" as an API-route case |
| Auth | Server Actions (`src/actions/auth.ts`) | sign-in/register/password-reset all Server Actions, even though they call bcrypt/Resend |

**Decision for this plan:** Checkout/Billing-Portal session creation → **Server Actions** (`src/actions/billing.ts`). They're simple, authenticated, single-purpose mutations that end in a redirect — the same shape as `deleteAccountAction`'s `<form action={...}>` pattern already in `AccountActions.tsx`, and Next.js's `redirect()` works natively inside a Server Action triggered by a plain form (no client JS, no SWR mutation plumbing needed). The Stripe **webhook** is unambiguously an API route — it has no session, needs the raw request body for signature verification, and coding standards explicitly list "Webhooks (Stripe, GitHub, etc.)" as the API-route case.

### Error handling / response shape conventions

- Server Actions: `{ success, data?, error? }`, `auth()` checked first and returned as `{success:false, error:"Not authenticated"}` (never thrown) — see every function in `src/actions/items.ts`.
- API routes: `NextResponse.json({ success, data?, error? }, { status })`, same auth-check-first shape, e.g. `src/app/api/collections/route.ts`.
- DB-layer mutations that touch external services (R2) already establish the "log and rethrow" pattern (`console.error` then `throw err`) rather than swallowing — `setItemFavorite`, `updateItem` in `items-mutations.ts`. Stripe calls should follow the same discipline.
- `getAppUrl()` (`src/lib/app-url.ts`) is the established, security-reviewed way to build absolute URLs (never trust the `Host` header — this was a real fixed vulnerability, see the 2026-08-25 history entry). Checkout `success_url`/`cancel_url` and the Billing Portal `return_url` must use it.

### Environment variables

`.env.example` **already has placeholder Stripe entries** (added ahead of this research, presumably in anticipation of this feature):

```
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PREICE_ID_MONTHLY=""
STRIPE_PREICE_ID_YEARLY=""
```

Two issues to fix while wiring this up:
1. **Typo**: `PREICE` → `PRICE` on both price-id vars.
2. `STRIPE_PUBLISHABLE_KEY` is listed but this plan's checkout flow never needs it server-side or client-side — Stripe Checkout is fully hosted (redirect-based), not Stripe.js/Elements embedded. Leave the var in `.env.example` for now (harmless, and cheap to have if an embedded flow is added later) but nothing in this plan reads it.

### Settings page (`src/app/settings/page.tsx`)

Already established as the home for account-level settings (moved here from `/profile` in the 2026-09-02 history entry). Structure: `getProfileUser()` wrapped in try/catch → redirect-on-auth-failure / `hasError` flag, then renders `<AccountActions>` and `<EditorPreferencesSettings>` as sibling `Card`s, each `lg:w-[790px] md:w-[700px] w-[300px] rounded-[10px]`. A new `<BillingSettings>` card slots in the same way.

---

## 2. Feature Gating Analysis

### The two numeric free-tier limits (50 items / 3 collections)

**Currently enforced nowhere.** Confirmed by reading `createItem` (`src/actions/items.ts`) and `POST /api/collections` (`src/app/api/collections/route.ts`) end to end — both validate input and check auth, but never check a count against a limit.

Existing count queries to reuse (don't add new ones):
- `getItemStats()` (`src/lib/db/item-metadata.ts`) → `{ total, favorites }`, already used by the dashboard stats cards.
- `getCollectionStats()` (`src/lib/db/collections.ts`) → `{ total, favorites }`, same pattern.

Enforcement points:
- **Items**: `createItem` in `src/actions/items.ts`, before the DB call.
- **Collections**: `POST /api/collections` in `src/app/api/collections/route.ts`, before `createCollection()`.

### Pro-only item types (file uploads) — a real discrepancy to resolve first

`context/project-overview.md`'s monetization table says:

> Free: *"Basic search, image uploads, no AI"* — Pro: *"File uploads, custom types, AI features, export"*

Read literally, **Free tier includes image uploads**; only `file`-type items are Pro-gated. But `Sidebar.tsx` (line ~114) already ships a cosmetic "Pro" badge on **both** `file` and `image` types:

```tsx
{(type.name === "file" || type.name === "image") && (
  <Badge variant="outline" className="uppercase">Pro</Badge>
)}
```

This badge is currently decorative only — `POST /api/upload` has no gating at all today, so a free user can already upload both kinds. **This needs a decision before writing enforcement code**, since it's a one-line difference in a shared constant (`PRO_ONLY_ITEM_TYPES`) but a real product/UX decision, not an implementation detail:

- **Option A** — match the written spec: only `file` is Pro-gated, `image` stays free. Requires removing the badge from the `image` row in `Sidebar.tsx`.
- **Option B** — match the already-shipped UI: both `file` and `image` are Pro-gated (treat the Sidebar badge as the source of truth, project-overview.md as stale).

This plan implements the gate as a single exported list (`PRO_ONLY_ITEM_TYPES` in `src/lib/subscription-limits.ts`) so either choice is a one-line change with no other code touched. **Recommendation: Option B** — the badge is already user-facing, and un-gating `image` after users have seen it marked "Pro" reads as a downgrade of a promise rather than a fix; simpler to instead update `project-overview.md`'s table to match. Confirm with the user before implementing.

### Pro-only features not yet built (AI, custom item types, export)

None of these exist in the codebase yet (`AI Superpowers`, custom `ItemType` creation UI, and export are all unchecked in the Roadmap section of `project-overview.md`). Nothing to gate today. When each is built, the gate is simply `session.user.isPro` (available directly on the session after §6 — no extra DB query needed at the call site).

### Settings page structure (recap from §1)

`<BillingSettings>` is a new sibling card next to `<AccountActions>`/`<EditorPreferencesSettings>` in `src/app/settings/page.tsx`, following the identical `Card`/`CardHeader`/`CardTitle`/`CardContent` shape and width classes.

---

## 3. API & Webhook Patterns

- Next.js 16 App Router route handlers give raw body access via `await request.text()` with **no** `bodyParser: false` config needed (that's a Pages Router-only concern) — confirmed against the current Next.js docs. This is exactly what Stripe's `constructEvent` needs (it must verify the signature against the untouched raw bytes).
- Stripe's Node SDK (`stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret)`) throws on a bad signature — catch and return `400`, matching this project's existing "reject cleanly, don't 500" convention for validation failures.
- Rate limiting: **not applicable** to the webhook route — it's authenticated by signature, not a user-facing form, and Stripe's own retry behavior would fight a rate limiter. The existing `checkRateLimit` infra (`src/lib/rate-limit.ts`) is per-user/per-IP and doesn't fit here; don't reuse it for this route.
- Idempotency: Stripe can (and does) deliver the same event more than once. Every webhook handler in this plan writes via `prisma.user.updateMany({ where: { stripeCustomerId }, data: {...} })` with fields set to their *final* value (not incremented/toggled), so replaying the same event is a safe no-op. No dedup/event-log table needed — consistent with this project's general preference for the simplest mechanism that's actually correct (e.g. `deleteMany`-as-atomic-ownership-check elsewhere in the codebase), rather than adding infrastructure speculatively.
- Stripe API version note (verified live against the current Stripe Node SDK docs): as of API version `2025-03-31.basil` (stripe-node v18+), **`current_period_end` moved from the `Subscription` object to each `SubscriptionItem`** (`subscription.items.data[0].current_period_end`). This is exactly the kind of non-obvious, version-specific fact this codebase tends to flag with an inline comment (see `getClientIp()`, `getAppUrl()`) — the webhook handler code below does the same.

---

## 4. Environment Variables

Update `.env.example` (fixing the existing typo) and add matching entries to `.env`/your deployed env config:

```bash
# Stripe (https://dashboard.stripe.com/apikeys) — see docs/stripe-integration-plan.md
# for Dashboard setup steps (product, prices, webhook endpoint).
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=
STRIPE_PRICE_ID_YEARLY=
```

(`STRIPE_PUBLISHABLE_KEY` can stay as-is in `.env.example` — unused by this plan's hosted-Checkout flow, harmless to leave for a future embedded-Elements flow.)

---

## 5. Files to Create

### 5.1 Prisma migration — two new `User` fields

Edit `prisma/schema.prisma`'s `User` model:

```prisma
model User {
  id                     String    @id @default(cuid())
  name                   String?
  email                  String    @unique
  emailVerified          DateTime?
  image                  String?
  password               String?
  isPro                  Boolean   @default(false)
  stripeCustomerId       String?
  stripeSubscriptionId   String?
  stripePriceId          String?
  stripeCurrentPeriodEnd DateTime?
  editorPreferences      Json?
  ...
```

Then, per coding standards, run a real migration — **not** `db push`:

```bash
npx prisma migrate dev --name add_stripe_subscription_fields
npx prisma migrate status   # verify in sync before committing
```

`stripePriceId` lets the app know monthly vs. yearly without a Stripe API call; `stripeCurrentPeriodEnd` powers the "renews on…" copy in Billing Settings and lets a cancelled-but-not-yet-expired subscription still read as Pro until the period actually ends.

### 5.2 `src/lib/stripe.ts` — Stripe client singleton

Mirrors `src/lib/prisma.ts`'s throw-if-unset pattern.

```typescript
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

// apiVersion intentionally omitted — the installed SDK pins its own default API
// version (see stripe-node's CHANGELOG), which is more reliable than hardcoding
// a date string here that will silently go stale.
export const stripe = new Stripe(secretKey);
```

Install the dependency:

```bash
npm install stripe
```

### 5.3 `src/lib/subscription-limits.ts` — free-tier limits and Pro-only types

```typescript
import { getItemStats } from "@/lib/db/item-metadata";
import { getCollectionStats } from "@/lib/db/collections";

export const FREE_TIER_ITEM_LIMIT = 50;
export const FREE_TIER_COLLECTION_LIMIT = 3;

// See docs/stripe-integration-plan.md §2 — resolve the file-vs-image Pro-gating
// discrepancy with project-overview.md's monetization table before relying on
// this list for real enforcement.
export const PRO_ONLY_ITEM_TYPES = ["file", "image"] as const;

export function isProOnlyItemType(typeName: string): boolean {
  return (PRO_ONLY_ITEM_TYPES as readonly string[]).includes(typeName);
}

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
```

### 5.4 `src/lib/db/subscription.ts` — billing DB helpers

```typescript
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/user";

export interface BillingInfo {
  isPro: boolean;
  currentPeriodEnd: Date | null;
}

export async function getBillingInfo(): Promise<BillingInfo> {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { isPro: true, stripeCurrentPeriodEnd: true },
  });

  return { isPro: user.isPro, currentPeriodEnd: user.stripeCurrentPeriodEnd };
}

export async function getOrCreateStripeCustomerId(
  userId: string,
  email: string,
  createCustomer: (email: string, userId: string) => Promise<string>
): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customerId = await createCustomer(email, userId);
  await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
  return customerId;
}
```

(`getOrCreateStripeCustomerId` takes the Stripe API call as an injected function rather than importing `stripe` directly, keeping this file — like the rest of `src/lib/db/`— a thin, mockable Prisma boundary; the actual `stripe.customers.create` call lives in `src/actions/billing.ts`.)

### 5.5 `src/lib/validations/billing.ts`

```typescript
import { z } from "zod";

export const billingPeriodSchema = z.enum(["monthly", "yearly"]);
```

### 5.6 `src/types/billing.ts`

```typescript
export interface CreateCheckoutSessionResult {
  success: boolean;
  error?: string;
}

export type CreatePortalSessionResult = CreateCheckoutSessionResult;
```

Note: the "success" branch of both actions ends in `redirect()`, which throws — a real success never actually constructs and returns a `{success:true}` value. The type still models it for callers/tests reasoning about the shape, but only the failure path is ever observed at runtime.

### 5.7 `src/actions/billing.ts` — Checkout & Billing Portal Server Actions

```typescript
"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/app-url";
import { getOrCreateStripeCustomerId } from "@/lib/db/subscription";
import { billingPeriodSchema } from "@/lib/validations/billing";
import type { CreateCheckoutSessionResult, CreatePortalSessionResult } from "@/types/billing";

const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY,
  yearly: process.env.STRIPE_PRICE_ID_YEARLY,
} as const;

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

  const priceId = PRICE_IDS[parsed.data];

  if (!priceId) {
    console.error(`Missing Stripe price id env var for billing period "${parsed.data}"`);
    return { success: false, error: "Billing is not configured" };
  }

  let checkoutUrl: string | null;
  try {
    const customerId = await getOrCreateStripeCustomerId(
      session.user.id,
      session.user.email,
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

  if (!user?.stripeCustomerId) {
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
```

Both `client_reference_id` (on the Checkout Session) and `subscription_data.metadata.userId` (on the resulting Subscription) carry the user id redundantly — the customer is looked up primarily by `stripeCustomerId` (created eagerly, before redirecting, so it's guaranteed to exist by the time any webhook fires), with the subscription metadata as a self-contained fallback if a subscription ever needs to be reasoned about independent of the checkout flow (e.g. a support script).

### 5.8 `src/app/api/webhooks/stripe/route.ts` — webhook handler

```typescript
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const ACTIVE_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing"];

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
    console.error(`No user found for Stripe customer ${customerId} (subscription ${subscription.id})`);
  }
}

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
        if (checkoutSession.mode === "subscription" && typeof checkoutSession.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription);
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
```

`customer.subscription.deleted` needs no separate branch: its `status` is `"canceled"`, which `ACTIVE_STATUSES.includes(...)` correctly evaluates to `isPro: false`. This also means a failed-payment dunning cycle (`active` → `past_due` → `canceled`) downgrades automatically via the same `customer.subscription.updated` events, with no need to separately handle `invoice.payment_failed`.

### 5.9 `src/components/settings/BillingSettings.tsx`

Async server component, same shape as `RecentCollections`/`ItemsGrid`'s established try/catch → destructive-text-error pattern, and the same `Card` sizing as its settings-page siblings.

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBillingInfo } from "@/lib/db/subscription";
import { createCheckoutSession, createBillingPortalSession } from "@/actions/billing";

export async function BillingSettings() {
  let billing;
  try {
    billing = await getBillingInfo();
  } catch {
    return (
      <Card className="rounded-[10px] lg:w-[790px] md:w-[700px] w-[300px]">
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load billing info. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[10px] lg:w-[790px] md:w-[700px] w-[300px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Billing
          <Badge variant="outline" className="uppercase">
            {billing.isPro ? "Pro" : "Free"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {billing.isPro ? (
          <>
            <p className="text-sm text-muted-foreground">
              {billing.currentPeriodEnd
                ? `Renews ${billing.currentPeriodEnd.toLocaleDateString()}`
                : "You're on the Pro plan."}
            </p>
            <form action={createBillingPortalSession}>
              <Button type="submit" variant="outline" className="rounded-[5px]">
                Manage subscription
              </Button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Upgrade for unlimited items and collections, file uploads, and AI features.
            </p>
            <div className="flex gap-3">
              <form action={createCheckoutSession.bind(null, "monthly")}>
                <Button type="submit" className="rounded-[5px]">
                  Upgrade — $8/mo
                </Button>
              </form>
              <form action={createCheckoutSession.bind(null, "yearly")}>
                <Button type="submit" variant="outline" className="rounded-[5px]">
                  Upgrade — $72/yr
                </Button>
              </form>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

`.bind(null, "monthly")` on a `"use server"` action is the standard way to pass an extra argument to a form action without client JS — matches `AccountActions.tsx`'s existing `<form action={deleteAccountAction}>` pattern, just with a bound arg.

---

## 6. Files to Modify

### 6.1 `src/types/next-auth.d.ts` — add `isPro` to the session/JWT shape

```diff
 declare module "next-auth" {
   interface Session {
     user: {
       id: string;
+      isPro: boolean;
     } & DefaultSession["user"];
   }
 }

 declare module "next-auth/jwt" {
   interface JWT {
     id: string;
+    isPro: boolean;
   }
 }
```

### 6.2 `src/auth.ts` — sync `isPro` on every session check (the research prompt's documented fix)

The `jwt` callback becomes `async` and re-reads `isPro` from the DB every time a session is validated — not just at sign-in — so a webhook-driven change is picked up on the user's very next request, not just their next login:

```diff
   callbacks: {
-    jwt({ token, user }) {
+    async jwt({ token, user }) {
       if (user?.id) {
         token.id = user.id;
       }
+
+      // Re-sync on every call (not just sign-in) so a Stripe webhook's isPro
+      // update is picked up on the user's next request, not just next login —
+      // see docs/stripe-integration-plan.md.
+      if (token.id) {
+        const dbUser = await prisma.user.findUnique({
+          where: { id: token.id },
+          select: { isPro: true },
+        });
+        token.isPro = dbUser?.isPro ?? false;
+      }
+
       return token;
     },
     session({ session, token }) {
       return {
         expires: session.expires,
         user: {
           id: token.id,
           name: token.name ?? null,
           email: token.email ?? "",
           image: token.picture ?? null,
+          isPro: token.isPro ?? false,
         },
       };
     },
   },
```

**Cost**: one extra `User.isPro`-only indexed-PK lookup per `auth()` call — cheap, and it's what makes `session.user.isPro` trustworthy enough to gate on directly in Server Actions/API routes without a second query (see §6.4–6.6). This directly implements the workaround the research prompt's own notes call for, adapted to this project's real `jwt`/`session` callback shape (which, unlike the prompt's generic example, already hand-builds the session object field-by-field rather than spreading).

### 6.3 `.env.example`

```diff
-STRIPE_PREICE_ID_MONTHLY=""
-STRIPE_PREICE_ID_YEARLY=""
+# Stripe (https://dashboard.stripe.com/apikeys) — see docs/stripe-integration-plan.md
+STRIPE_PRICE_ID_MONTHLY=""
+STRIPE_PRICE_ID_YEARLY=""
+STRIPE_WEBHOOK_SECRET=""
```

(`STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` already present and correctly spelled — leave as-is.)

### 6.4 `src/actions/items.ts` — enforce the item limit and Pro-only types

```diff
 import { getItemTypeByName } from "@/lib/db/item-metadata";
 import { createItemSchema, updateItemSchema } from "@/lib/validations/items";
+import { isAtItemLimit, isProOnlyItemType } from "@/lib/subscription-limits";
 import type { CreateItemActionResult, DeleteItemActionResult, UpdateItemActionResult } from "@/types/items";

 export async function createItem(data: {...}): Promise<CreateItemActionResult> {
   const session = await auth();

   if (!session?.user?.id) {
     return { success: false, error: "Not authenticated" };
   }

   const parsed = createItemSchema.safeParse(data);

   if (!parsed.success) {
     return { success: false, error: parsed.error.issues[0].message };
   }

+  if (isProOnlyItemType(parsed.data.type) && !session.user.isPro) {
+    return { success: false, error: "Upgrade to Pro to create file and image items." };
+  }
+
+  if (await isAtItemLimit(session.user.isPro)) {
+    return {
+      success: false,
+      error: "Free plan is limited to 50 items. Upgrade to Pro for unlimited items.",
+    };
+  }
+
   const type = await getItemTypeByName(parsed.data.type);
   ...
```

Only `createItem` needs this — `updateItem` doesn't change the item count, and editing an existing file/image item that a user already has shouldn't suddenly break if they downgrade.

### 6.5 `src/app/api/collections/route.ts` — enforce the collection limit

```diff
 import { NextResponse } from "next/server";
 import { auth } from "@/auth";
 import { createCollection, getAllCollections } from "@/lib/db/collections";
 import { createCollectionSchema } from "@/lib/validations/collections";
+import { isAtCollectionLimit } from "@/lib/subscription-limits";

 export async function POST(request: Request) {
   const session = await auth();

   if (!session?.user?.id) {
     return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
   }

+  if (await isAtCollectionLimit(session.user.isPro)) {
+    return NextResponse.json(
+      {
+        success: false,
+        error: "Free plan is limited to 3 collections. Upgrade to Pro for unlimited collections.",
+      },
+      { status: 403 }
+    );
+  }
+
   const body = await request.json();
   ...
```

### 6.6 `src/app/api/upload/route.ts` — enforce Pro-only file/image types

```diff
 import { NextResponse } from "next/server";
 import { auth } from "@/auth";
 import { validateFile, sanitizeFileName, type UploadKind } from "@/lib/file-constraints";
 import { buildObjectKey, buildPublicUrl, uploadToR2 } from "@/lib/r2";
 import { checkRateLimit, rateLimitMessage, retryAfterSeconds } from "@/lib/rate-limit";
+import { isProOnlyItemType } from "@/lib/subscription-limits";

 export async function POST(request: Request) {
   const session = await auth();

   if (!session?.user?.id) {
     return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
   }

+  const kind = request.headers.get("x-upload-kind"); // placeholder — see note below
+
   const { success: withinLimit, reset } = await checkRateLimit("upload", session.user.id);
   ...
```

**Careful ordering note**: the route currently reads `kind` from `formData` *after* the rate-limit check, so the Pro-only check (which also needs `kind`) has to move to after `const kind = formData.get("kind")` is parsed, not before it as the diff skeleton above implies — i.e. insert the check right after the existing `if (!(file instanceof File) || (kind !== "image" && kind !== "file"))` validation block:

```diff
   const validationError = validateFile(kind as UploadKind, file.name, file.type, file.size);

   if (validationError) {
     return NextResponse.json({ success: false, error: validationError }, { status: 400 });
   }

+  if (isProOnlyItemType(kind) && !session.user.isPro) {
+    return NextResponse.json(
+      { success: false, error: `Upgrade to Pro to upload ${kind}s.` },
+      { status: 403 }
+    );
+  }
+
   const sanitizedName = sanitizeFileName(file.name);
```

(Ignore the earlier `x-upload-kind` header sketch — `kind` is already available from `formData` at this point in the real file; no header needed.)

### 6.7 `src/app/settings/page.tsx` — add the Billing card

```diff
 import { AccountActions } from "@/components/profile/AccountActions";
+import { BillingSettings } from "@/components/settings/BillingSettings";
 import { EditorPreferencesSettings } from "@/components/settings/EditorPreferencesSettings";
 ...
         {hasPassword !== null && (
           <AccountActions
             hasPassword={hasPassword}
             changePasswordAction={changePassword}
             deleteAccountAction={deleteAccount}
           />
         )}

+        <BillingSettings />
+
         <EditorPreferencesSettings />
```

### 6.8 `Sidebar.tsx` — only if Option A is chosen in §2

If the file-vs-image discrepancy is resolved as "only `file` is Pro" (Option A), remove `|| type.name === "image"` from the badge condition. **No change needed if Option B (current behavior) is confirmed.**

### 6.9 `context/project-overview.md` — reconcile the monetization table (whichever option is chosen)

If Option B is confirmed, update the Free-tier row's "image uploads" wording to remove that claim (e.g. `"Basic search, no AI"`), so the written spec matches shipped behavior instead of contradicting it.

---

## 7. Stripe Dashboard Setup Steps

1. **Create the product**: Dashboard → Product catalog → *Add product* → name it "DevStash Pro".
2. **Add two recurring prices** on that product:
   - Monthly: `$8.00 USD`, billing period "Monthly".
   - Yearly: `$72.00 USD`, billing period "Yearly".
   - Copy each price's `price_id` (starts `price_...`) into `STRIPE_PRICE_ID_MONTHLY` / `STRIPE_PRICE_ID_YEARLY`.
3. **Enable the Customer Portal**: Dashboard → Settings → Billing → Customer portal. Turn it on; configure what customers can do (cancel subscription, switch plan between the two prices, update payment method). At minimum enable "Cancel subscriptions" and "Update payment methods".
4. **Create the webhook endpoint**: Dashboard → Developers → Webhooks → *Add endpoint*.
   - URL: `${APP_URL}/api/webhooks/stripe` (production URL once deployed).
   - Events to send: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
   - Copy the endpoint's signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.
5. **Get API keys**: Dashboard → Developers → API keys. Copy the **test-mode** secret key into `STRIPE_SECRET_KEY` for local dev; use live-mode keys only in the production env config, never committed.
6. **For local development**, install the Stripe CLI and forward events to your dev server instead of (or in addition to) step 4's Dashboard-configured endpoint:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   This prints a separate `whsec_...` signing secret scoped to the CLI session — use that one in your local `.env` while testing locally (it differs from the Dashboard endpoint's secret).

---

## 8. Testing Checklist

Per `context/ai-interaction.md`: unit tests are required for anything touching `src/actions/` or `src/lib/`; route handlers (including the webhook) are not covered by Vitest per this project's existing convention (matches `src/app/api/upload/route.ts`, `src/app/api/collections/route.ts` — neither has a unit test today).

### Unit tests (Vitest) to add

- `src/lib/subscription-limits.test.ts`: `isAtItemLimit`/`isAtCollectionLimit` (`isPro: true` always returns `false`; below/at/above the threshold for `isPro: false`, mocking `getItemStats`/`getCollectionStats`); `isProOnlyItemType` for both gated and ungated type names.
- `src/lib/db/subscription.test.ts`: `getBillingInfo` mapping and session-failure propagation (mocked Prisma, matching `user.test.ts`'s existing style); `getOrCreateStripeCustomerId`'s two branches (existing id returned as-is with the injected `createCustomer` never called; missing id calls it once and persists the result).
- `src/actions/billing.test.ts`: auth guard, invalid billing period, missing price-id env var, and the Stripe-call-throws → `{success:false}` path for both actions — mock `@/lib/stripe`, `next/navigation`'s `redirect` (assert it's called with the right URL rather than trying to execute the throw), and `@/lib/app-url`.
- Extend `src/actions/items.test.ts` (`createItem`): free-tier limit rejection, Pro-user bypass, Pro-only-type rejection for a free user.
- No new test file for the webhook route or the two modified API routes, matching existing convention — cover them via the manual checklist below instead.

### Manual / live end-to-end (Stripe test mode, `stripe listen` running)

- [ ] Upgrade flow: click "Upgrade — $8/mo" on a free test account → redirected to Stripe Checkout → complete with test card `4242 4242 4242 4242` → redirected back to `/settings?checkout=success`.
- [ ] Confirm `checkout.session.completed` fired in the CLI output and `User.isPro`/`stripeSubscriptionId`/`stripePriceId`/`stripeCurrentPeriodEnd` were all set correctly (check via Neon MCP against the **development** branch).
- [ ] Confirm the Billing card reflects "Pro" without requiring a fresh sign-in — a page reload/navigation is enough, per the JWT re-sync fix (this is the specific behavior §6.2 exists to guarantee).
- [ ] Repeat for the yearly price.
- [ ] Manage subscription: click "Manage subscription" → lands on Stripe's real Billing Portal for that customer → cancel the subscription there.
- [ ] Confirm `customer.subscription.deleted` (or `.updated` with `status: "canceled"`) fired and `User.isPro` flipped back to `false`; Billing card reflects "Free" after a reload.
- [ ] Free-tier item limit: seed a throwaway test account to exactly 50 items, confirm `createItem` is rejected with the upgrade-prompt message on the 51st, and confirm the same account can still create items once flipped to Pro via the Dashboard (manually set `isPro: true` or run a real test-mode checkout).
- [ ] Free-tier collection limit: same shape, at 3 collections.
- [ ] Pro-only upload gating (once §2's Option A/B decision is confirmed): a free account's upload of the gated type(s) returns the 403 upgrade message; a Pro account's upload succeeds.
- [ ] Webhook signature rejection: `curl` the webhook URL directly with a garbage `stripe-signature` header → expect `400`, and confirm no DB write happened.
- [ ] Webhook idempotency: use `stripe events resend <event_id>` (or replay via the CLI) to redeliver a `customer.subscription.updated` event already processed → confirm no error and the DB state is unchanged (still correct, not duplicated/corrupted).
- [ ] `npm run test`, `npm run lint`, `npm run build`, `tsc --noEmit` all pass.
- [ ] Throwaway test users/subscriptions cleaned up in both the dev Neon DB and the Stripe test-mode dashboard after verification.

---

## 9. Implementation Order

1. **Resolve the file-vs-image Pro-gating discrepancy** (§2) — blocks §6.6/§6.8/§6.9, ask the user before writing that code.
2. Stripe Dashboard setup (§7): product, two prices, webhook endpoint, Customer Portal config.
3. `npm install stripe`; update `.env.example` and local `.env` (§4, §6.3).
4. Prisma migration: `stripePriceId`/`stripeCurrentPeriodEnd` (§5.1).
5. `src/lib/stripe.ts` (§5.2).
6. `src/types/next-auth.d.ts` + `src/auth.ts` JWT/session `isPro` sync (§6.1–6.2) — do this early since everything downstream reads `session.user.isPro`.
7. `src/types/billing.ts`, `src/lib/validations/billing.ts`, `src/lib/db/subscription.ts` (§5.4–5.6).
8. `src/actions/billing.ts` (§5.7).
9. `src/app/api/webhooks/stripe/route.ts` (§5.8) — verify against `stripe listen` locally before moving on; this is the piece with the most non-obvious, version-specific details (raw body, signature verification, `current_period_end`'s location).
10. `src/lib/subscription-limits.ts` (§5.3), then wire enforcement into `src/actions/items.ts` (§6.4), `src/app/api/collections/route.ts` (§6.5), `src/app/api/upload/route.ts` (§6.6).
11. `src/components/settings/BillingSettings.tsx` + `src/app/settings/page.tsx` wiring (§5.9, §6.7).
12. Update `Sidebar.tsx`/`project-overview.md` per the §1 decision, if Option A (§6.8–6.9).
13. Unit tests (§8's Vitest list).
14. Full manual/live verification checklist (§8) against Stripe test mode.
15. `npm run build`/`lint`/`tsc --noEmit` clean, then commit — following this project's established one-feature-per-branch workflow (`feature/stripe-integration`), not committed until the user confirms it's ready per `context/ai-interaction.md`.
