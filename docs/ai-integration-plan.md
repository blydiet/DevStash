# AI Integration Plan (Auto-tagging, Summaries, Explain Code, Prompt Optimization)

This covers the four "AI Superpowers (Pro)" features from `context/project-overview.md`: auto-tagging, AI summaries, explain code, and prompt optimization. **Auto-tagging has since shipped** (`feature/ai-auto-tagging`: `src/actions/ai.ts`, `src/lib/openai.ts`, `openai` in `package.json`) — see the model resolution below and §2c. Summaries, explain code, and prompt optimization remain unbuilt; this doc's patterns (SDK usage, Server Action shape, streaming, rate limiting, Pro-gating, cost controls, security) still apply to them, following the precedent auto-tagging already established.

**✅ Model resolved:** this doc originally flagged its research prompt's target model, **"GPT-6 Astra,"** as unverifiable and likely steering toward an unnecessarily expensive flagship model for a lightweight tagging task (see the original §2 discussion, kept below for that reasoning). The model actually shipped with is **`gpt-5.6-luna`** (configurable via the `OPENAI_MODEL` env var, `src/lib/openai.ts`) — also not in this assistant's training data at the time it was chosen, but confirmed genuinely real and working once real API calls succeeded: live testing (both the item-drawer edit flow and the Create Item dialog) returned correct, relevant tag suggestions end-to-end. Astra was not used. Everything else in this document (SDK usage, patterns, gating, security) applies regardless of model — only the model string and cost math would change if this is revisited.

---

## 1. Current State Analysis

### Schema (`prisma/schema.prisma`)

No AI-related fields anywhere. Relevant existing fields per `Item`: `title`, `content` (text-based types), `description`, `language`, `tags` (via `ItemTag`/`Tag`). Auto-tagging and summaries would read/write these; explain-code and prompt-optimization are read-only transforms that don't need new columns unless usage tracking is added (see §7).

### Server Actions vs. API routes (established split)

Per `docs/stripe-integration-plan.md`'s table, this codebase splits mutations by domain, not by a hard rule:

| Domain | Mutated via | Precedent |
|---|---|---|
| Items | Server Actions (`src/actions/items.ts`) | `createItem`, `updateItem`, `toggleItemFavorite` |
| Collections | API routes (`src/app/api/collections/`) | `POST/GET`, `PATCH/DELETE [id]` |
| Uploads | API route | `POST /api/upload` — coding standard explicitly lists "third-party integrations" as an API-route case |
| Billing | Server Actions (`src/actions/billing.ts`) | `createCheckoutSession`, ends in `redirect()` |

**AI calls are a third-party integration** (same category as R2/Stripe), and per the coding standard's own list that's a documented API-route case — but every *other* third-party call in this codebase (Stripe checkout, R2 delete-on-item-delete) is still wrapped in a Server Action or DB-layer function, not exposed as its own route, because the caller is always an authenticated in-app mutation, not a webhook or an upload needing raw-body/progress handling. AI calls fit that same shape: an authenticated user clicking "Summarize" on an item they own. Recommend **Server Actions** (`src/actions/ai.ts`), matching items/billing, *unless* streaming is used (see §4) — a streamed response is easier to consume client-side from a `fetch` against a route handler than from a Server Action (Server Actions can return a `ReadableStream`-backed value via `createStreamableValue`-style patterns, but that requires the Vercel AI SDK, which isn't in this project — see §2b).

### Error handling / response shape convention

Every existing action/route returns `{ success, data?, error? }`, checks `auth()` first and returns (never throws) on no session, per `src/actions/items.ts` and `src/actions/billing.ts`. AI actions should match: `{ success: false, error: "Not authenticated" }` → Zod validation → Pro/ownership checks → the AI call itself wrapped in try/catch, logged via `console.error` before returning a generic user-facing error (the R2/Stripe "log and rethrow or log and return" convention from `items-mutations.ts`/`billing.ts`).

### Pro-gating pattern (`isProOnlyItemType` precedent)

`src/lib/subscription-limits.ts` already establishes the shape a new `isAiFeatureAllowed`-style check should follow:

```ts
export const PRO_ONLY_ITEM_TYPES = ["file", "image"] as const;
export function isProOnlyItemType(typeName: string): typeName is (typeof PRO_ONLY_ITEM_TYPES)[number] { ... }
```

`session.user.isPro` (added to the JWT/session shape in the Stripe Phase 1 work, re-synced from the DB on every `auth()` call) is the source of truth — checked directly in `src/actions/items.ts`'s `createItem` (`isProOnlyItemType(parsed.data.type) && !session.user.isPro`) and `POST /api/upload`. AI actions should gate the same way: check `session.user.isPro` immediately after the auth check, before touching OpenAI at all, so an unauthorized call never spends a token.

### Rate limiting (`src/lib/rate-limit.ts`)

Already a generic, scope-keyed Upstash wrapper (`RateLimitScope` union, `checkRateLimit(scope, identifier)`, fails open if Upstash isn't configured). Adding AI scopes is additive — same shape as the existing `upload` scope (20/hour, keyed by `session.user.id` since the caller is already authenticated, not by IP):

```ts
export type RateLimitScope = /* ...existing... */ | "ai-tag" | "ai-summary" | "ai-explain" | "ai-optimize";
```

Per-feature scopes (not one shared `"ai"` scope) so a user hammering auto-tag doesn't also lock them out of prompt optimization, and so each feature's limit can be tuned independently by real cost (explain-code likely takes more input tokens than tagging a short snippet).

### Environment variables

`.env.example` already has a placeholder:

```
#Open AI
OPENAI_API_KEY=""
```

No `OPENAI_MODEL` or similar var exists — the model name is currently nowhere in code (project docs hardcode `gpt-5-nano` in prose, not in an env var). Recommend adding `OPENAI_MODEL` as an env var (default via `??` in code) rather than hardcoding the model string, following the `STRIPE_PRICE_ID_MONTHLY`/`YEARLY` precedent of keeping externally-changeable identifiers out of source — this also makes it trivial to swap models later without a redeploy-requiring code change, which matters given the model-choice question in §2.

### External client singleton pattern (`src/lib/r2.ts`, `src/lib/stripe.ts`)

Two established shapes to choose between:

- `stripe.ts`: throws at **module load** if the env var is unset (`if (!secretKey) throw new Error(...)`) — fine for Stripe since it's already load-bearing across the whole app once billing exists.
- `r2.ts`: throws **lazily** per-call via a `getEnv()` helper, with the client itself built lazily and cached (`let client: S3Client | null = null`).

Recommend the **lazy** `r2.ts` shape for `src/lib/openai.ts`: AI features are Pro-only and optional (the app must still build/run/`npm run test` in environments with no `OPENAI_API_KEY` set, e.g. CI, contributors without a key) — a module-load throw would break every unrelated test that imports anything transitively touching this module, the same class of bug the Stripe-phase-2 work hit and fixed by moving `isAtItemLimit` out of a module that pulled in unmocked Prisma (see the 2026-09-08 history entry). Lazy + cached client:

```ts
// src/lib/openai.ts
import OpenAI from "openai";

let client: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI({ apiKey });
  }
  return client;
}
```

### Testing scope (`context/coding-standards.md`)

Vitest covers `src/actions/` and `src/lib/` only, mocked at the module boundary (`vi.mock`) — never hitting real external services. `src/lib/openai.ts` itself should stay thin enough to mock wholesale in `src/actions/ai.test.ts` (`vi.mock("@/lib/openai")`), matching how `src/actions/billing.test.ts` mocks `@/lib/stripe` and `@/lib/db/subscription` rather than hitting real Stripe.

---

## 2. Model Choice

### 2a. What "GPT-6 Astra" actually is

Verified via web search (not in this assistant's training data — released after its January 2026 knowledge cutoff):

- Released 2026-09-03, OpenAI's new flagship frontier model. Positioned for "the hardest end-to-end work" — complex reasoning, coding, computer use, research. SOTA on FrontierMath Tier 4 (98%), ARC-AGI-3 (99.9%), ExploitBench (100%).
- API model identifier: `gpt-6-astra`. Context window 1,050,000 tokens, max output 128,000 tokens.
- **Pricing: $10/M input tokens, $50/M output tokens** ($1/M cached-input, $12.50/M cache-write). Long-context requests (>272K input tokens) get 1.5–2× multipliers on top of that.
- **No smaller/cheaper variant exists at launch** — confirmed via search: "no mini or nano version at launch, and no GPT-6 Ultra." OpenAI's guidance is that the *previous* generation (GPT-5.6 Sol/Terra/Luna) remains "the better value for anything that is not a hard agentic task."

### 2b. Why this matters for these four features specifically

None of auto-tagging, summarization, explain-code, or prompt-optimization are "hardest end-to-end work" tasks — they're short, single-turn, non-agentic transforms over a few hundred to a few thousand tokens of item content. That's exactly the profile `gpt-5-nano` was chosen for (per the project's own docs), and exactly the profile OpenAI itself says Astra is *not* the value pick for.

Concretely, at Astra's output pricing ($50/M), a single 500-token AI summary costs **~2.5¢ in output tokens alone** before counting input. At Pro-tier usage volume (unlimited items, `context/project-overview.md`'s own "Open Questions" section already flags "gpt-5-nano calls should probably be throttled... to control cost" — written when nano pricing was assumed), a `$8/mo` Pro subscription could be consumed by a handful of AI calls. This isn't a style nitpick — it's a per-request cost ~50-500× a nano-tier model, which is the specific risk this research prompt's own "Cost optimization strategies" bullet was meant to investigate.

### 2c. Resolution (was: Recommendation)

This section originally posed two options without deciding between them. It's now resolved for the codebase:

1. ~~Use `gpt-5-nano` as originally documented~~ — superseded; the project docs' "gpt-5-nano" reference predates this decision.
2. ~~Use GPT-6 Astra~~ — **rejected.** Astra was never used. Its cost profile (§2a/§2b) is real reasoning to avoid it for lightweight, non-agentic tasks like these four, and that reasoning stands regardless of which model ended up shipping.

**What actually shipped (auto-tagging, `feature/ai-auto-tagging`): `gpt-5.6-luna`.** Configured via the `OPENAI_MODEL` env var (`src/lib/openai.ts`, default `"gpt-5.6-luna"` if unset), matching the "previous generation... better value for anything that is not a hard agentic task" model family OpenAI itself pointed to in §2a. Like Astra, this model name wasn't in this assistant's training data when chosen — but unlike Astra, it was confirmed genuinely real and working via live end-to-end testing (real OpenAI API calls returning correct, relevant tag suggestions), not just cited from a web search. Future features built from this plan (summaries, explain-code, prompt-optimization) should default to the same model via the same env var unless a specific feature's quality needs justify reconsidering.

Everything below is written to work with any model — swap the `OPENAI_MODEL` env var and adjust §7's cost estimates.

---

## 3. SDK Setup

Package: `openai` (official Node/TypeScript SDK — now installed, `^7.13.0`). Not the Vercel AI SDK (`ai` package) — this project has no other AI-SDK-style abstraction and the four features are simple enough not to need one; introducing it would be a new dependency for marginal benefit given the existing direct-fetch patterns this codebase already uses for Stripe/R2 (raw SDK client, no wrapper library).

Uses the **Responses API** (`client.responses.create`), OpenAI's current-generation API surface — the Chat Completions API still works but Responses is what OpenAI's own docs default every current example to, including structured outputs and reasoning-effort control.

**Now shipped as `src/lib/openai.ts`** (default model updated per §2c's resolution):

```ts
// src/lib/openai.ts
import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI({ apiKey });
  }
  return client;
}

export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";
```

---

## 4. Server Action Patterns Per Feature

All four follow one shape: auth → Pro-gate → rate-limit → ownership-scoped fetch of the item (via existing `getItemDetail`, which is already ownership-scoped and no-existence-leak per `src/lib/db/items-queries.ts`) → build a prompt → call OpenAI → validate/shape the result → return `{success, data}`. Sketch for auto-tagging:

```ts
// src/actions/ai.ts
"use server";

import { auth } from "@/auth";
import { getItemDetail } from "@/lib/db/items-queries";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { AI_MODEL, getOpenAIClient } from "@/lib/openai";

export async function suggestTags(itemId: string): Promise<AiSuggestTagsResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };
  if (!session.user.isPro) return { success: false, error: "Upgrade to Pro for AI features." };

  const { success: withinLimit, reset } = await checkRateLimit("ai-tag", session.user.id);
  if (!withinLimit) return { success: false, error: rateLimitMessage(reset) };

  const item = await getItemDetail(itemId); // already userId-scoped
  if (!item) return { success: false, error: "Item not found" };

  const content = item.content ?? item.description ?? "";
  if (!content.trim()) return { success: false, error: "Nothing to analyze" };

  try {
    const response = await getOpenAIClient().responses.create({
      model: AI_MODEL,
      input: [
        { role: "system", content: "Suggest 3-5 short, lowercase, hyphenated tags for this content. No explanation." },
        { role: "user", content: content.slice(0, 4000) }, // input cap, see §7
      ],
      text: {
        format: {
          type: "json_schema",
          name: "tag_suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: { tags: { type: "array", items: { type: "string" }, maxItems: 5 } },
            required: ["tags"],
            additionalProperties: false,
          },
        },
      },
      max_output_tokens: 100, // cost cap, see §7
    });

    const { tags } = JSON.parse(response.output_text) as { tags: string[] };
    return { success: true, data: { tags } };
  } catch (err) {
    console.error("Failed to suggest tags:", err);
    return { success: false, error: "AI tagging failed. Try again." };
  }
}
```

The other three follow the identical skeleton, differing only in the system prompt, schema, and whether streaming applies:

| Feature | Input | Output shape | Streaming? |
|---|---|---|---|
| Auto-tagging | `item.content ?? item.description` | Structured JSON (`{tags: string[]}`) | No — near-instant, structured output needs the full response anyway |
| AI summary | `item.content` | Plain text, capped length | Optional — see §5 |
| Explain code | `item.content` + `item.language` | Markdown text (can be long) | Yes recommended |
| Prompt optimization | `item.content` (prompt-type items) | Plain text (rewritten prompt) | Optional |

Structured Outputs (`text.format.type: "json_schema"` with `strict: true`) is the right tool for auto-tagging specifically — it *guarantees* schema-conforming JSON (verified via Context7 against OpenAI's current docs), so no manual JSON-parsing fallback/retry logic is needed the way it would be with plain prompting.

---

## 5. Streaming vs. Non-Streaming

The SDK's streaming shape (verified via Context7):

```ts
const stream = await client.responses.create({ model: AI_MODEL, input: [...], stream: true });
for await (const event of stream) {
  if (event.type === "response.output_text.delta") {
    // event.delta is the incremental text chunk
  }
}
```

**Recommendation per feature**, based on expected output length and this codebase's existing async-server-component-first conventions:

- **Auto-tagging**: non-streaming. Output is 3-5 short strings; the UI can't usefully render a partial tag list, and Structured Outputs' schema guarantee is only meaningful on the complete response.
- **Explain Code**: streaming. Output can be several paragraphs; users perceive streamed text as faster even when total latency is similar, and this is the one feature where a genuinely long response is likely.
- **Summary / Prompt Optimization**: non-streaming to start (both are typically short — a summary is capped anyway per §7, and a rewritten prompt is usually similar length to the input). Streaming can be added later without changing the request shape.

**Mechanical note**: this codebase has no existing streaming-response consumer (SSE/`ReadableStream`) anywhere — Stripe/R2/email are all single-response calls. Streaming from a Server Action requires either (a) the Vercel AI SDK's `createStreamableValue` (a new dependency this project doesn't have, not recommended for a single feature) or (b) a plain API route returning the raw SSE stream, consumed client-side via `fetch` + reading `response.body.getReader()` manually. **(b) is the better fit here** — it's the one case in this plan where an API route (not a Server Action) is the right call, consistent with the coding standard's "long-running operations" bullet for when to use a route over an action.

---

## 6. Error Handling and Rate Limiting

- **Rate limiting**: per-feature Upstash scopes as in §1, keyed by `session.user.id`. Suggested starting limits (tune after real usage data): tagging/summary 20/hour (matches the existing `upload` scope's order of magnitude), explain-code 10/hour (higher per-call cost), prompt-optimization 20/hour.
- **OpenAI SDK error types** (verified via Context7): `APIConnectionError`, `RateLimitError` (OpenAI's own 429, distinct from this app's Upstash limit), `APIError`. The SDK **already retries automatically** (`max_retries` defaults to 2) on transient failures — no need to hand-roll exponential backoff for standard calls, matching this project's general practice of trusting a library's own built-in guarantees rather than re-implementing them (per `context/ai-interaction.md`'s "don't add unnecessary error handling" guidance, reinforced by this project's own memory note that unnecessary try/catch-around-code-that-can't-throw gets reverted).
- **User-facing errors**: generic message via the existing `sonner` toast pattern (`"AI tagging failed. Try again."`), never surface the raw OpenAI error string to the client — matches the settings-page precedent of not leaking Prisma internals (`err.message`) to users.
- A distinct OpenAI 429 (their rate limit, not this app's Upstash one) should be caught and surfaced as "AI service is busy, try again shortly" rather than this app's `rateLimitMessage()` copy, since the two mean different things to a user.

---

## 7. Cost Optimization Strategies

1. **Input truncation**: cap what's sent to the model (e.g. `content.slice(0, 4000)` for tagging/summary — a title/description/short snippet needs far less than a full file). Explain-code needs a higher cap since code context matters more, but should still cap (e.g. 8,000 chars) rather than send unbounded item content.
2. **Output caps**: `max_output_tokens` on every call — tagging needs ~100, summary ~200-300, explain-code higher (~800) but still bounded, prompt-optimization roughly input-length.
3. **`reasoning_effort`**: seen in OpenAI's current docs on Chat Completions requests (`"reasoning_effort": "medium"`). None of these four features need heavy reasoning — set this to the lowest supported effort level to cut both latency and cost, especially load-bearing if the model ends up being GPT-6 Astra (§2), where reasoning tokens are billed as output tokens at the $50/M rate.
4. **Prompt caching**: OpenAI's own pricing already discounts **cached input tokens at 10× cheaper** than fresh input (confirmed for Astra: $1/M cached vs $10/M fresh). A stable system prompt per feature (the "suggest tags" instruction, the "explain this code" instruction) sent identically on every call is exactly what benefits from this — no code changes needed, it's automatic on the provider side for repeated prefixes, but worth keeping the system prompt byte-identical across calls (not dynamically interpolated) so it actually hits the cache.
5. **Structured Outputs over free-text + re-parsing**: for tagging, a guaranteed-schema JSON response avoids the retry-on-malformed-JSON cost multiplier that plain prompting risks.
6. **Model selection is the single biggest lever** — see §2. No amount of prompt/output tuning closes a 50-500× per-token pricing gap between `gpt-5-nano` and `gpt-6-astra`.
7. **Per-user usage caps beyond rate limiting**: since Pro is a flat `$8/mo`/`$72/yr` subscription (`context/project-overview.md`), unlimited AI usage per Pro user is an open-ended cost liability the project's own "Open Questions" section already flags. Recommend a soft monthly cap per feature (e.g. tracked via a small counter, reset monthly — no schema exists for this yet; would need a new `User.aiUsageResetAt`/counter field or a Redis-backed counter reusing the existing Upstash connection) rather than relying on hourly rate limits alone, which bound burst rate but not total monthly spend.

---

## 8. Pro User Gating Patterns

Follows §1's existing `isProOnlyItemType`/`session.user.isPro` pattern exactly — no new gating mechanism needed:

```ts
if (!session.user.isPro) {
  return { success: false, error: "Upgrade to Pro for AI features." };
}
```

Placed immediately after the auth check and before any OpenAI call, so a free user's request never spends a token (unlike the item-type gate, which currently runs after Zod validation but before the DB write — AI's gate should run *before* even reading the item, since reading is cheap but calling OpenAI is the expensive step being guarded against).

**UI-side gating — what shipped**: rather than hiding the button for free users (which would've meant prop-drilling `isPro` through `DashboardShell` down to the AI buttons, since this codebase has zero client-side session access anywhere — every Pro check happens server-side via `auth()`), the button is **always shown**. A free user clicking it gets the server action's `upgradeRequired: true` result surfaced as a toast ("Upgrade to Pro for AI features.") with an "Upgrade" action that navigates to `/upgrade?feature=ai` (the `PRO_FEATURE_UPGRADE_CONTEXT`/`isKnownProFeature` pair in `src/lib/pricing-plans.ts`, generalized beyond the file/image-only `PRO_ONLY_ITEM_TYPES` this doc originally pointed to). This was an explicit choice, confirmed with the user, over the file/image pages' hide-and-redirect pattern — a good default for future AI-gated buttons in this codebase too, given the same session-access constraint applies to all of them.

---

## 9. UI Patterns

No existing precedent in this codebase for AI-suggestion UI specifically, but two closely-related patterns to reuse:

- **Loading state**: `useActionState`'s `isPending` (already the standard form-submission pattern per `SignInForm.tsx`/`RegisterForm.tsx`/`BillingActions.tsx`) — a "Suggest tags" button shows a spinner/disabled state while the action runs, same shape as every other async button in this app. No new loading-state primitive needed.
- **Accept/reject suggestions**: closest existing precedent is the edit-mode pattern in `ItemDrawerEditForm.tsx` (Save/Cancel with optimistic local state) — an AI suggestion should populate the relevant field (tags, description) as a **proposed, editable value** the user can accept-as-is, edit, or discard, not an auto-applied silent write. **Correction from an earlier draft of this doc**: there is no tag-chip UI anywhere in this codebase — Tags is a plain comma-separated text `Input` (`form.tags: string`, both in `ItemDrawerEditForm.tsx`'s `EditForm` and `CreateItemDialog.tsx`'s `CreateItemFormState`). What actually shipped: "Suggest tags" appends suggested tags into that comma-separated string (deduped case-insensitively against what's already there) via a shared `mergeTagInput` helper (`src/lib/tag-input.ts`), used by both the edit form and the Create Item dialog. The user still has to hit Save/Create to persist, so a bad suggestion costs nothing and needs no separate "undo".
- **Explain Code output**: rendered via the existing `MarkdownEditor`'s read-only Preview pane (`react-markdown` + `remark-gfm`, already wired for prompt/note content) rather than a new markdown renderer — explain-code output is markdown-shaped (headings, code blocks) and this component already exists.
- **Streaming UI** (Explain Code only, per §5): incremental text append to a `useState` string as SSE chunks arrive, rendered live into the same `MarkdownEditor`-style preview — no new component, just a different data source (a `fetch` reader loop instead of a static prop).

---

## 10. Security Considerations

- **API key handling**: server-only, via `getOpenAIClient()` in `src/lib/openai.ts` (§1/§3) — never referenced in any `"use client"` file or exposed to the browser, matching how `STRIPE_SECRET_KEY`/R2 credentials are handled (both server-only singletons, no `NEXT_PUBLIC_` prefix).
- **Input sanitization / prompt injection**: item `content`/`description` is user-authored and gets embedded directly into the prompt sent to OpenAI. This app has no cross-user exposure risk from that content today (the model's output goes back to the *same* user who owns the item, via the existing ownership-scoped `getItemDetail`), so classic "prompt injection to leak other users' data" doesn't apply directly — but a malicious item body could still try to make the model ignore its system instructions (e.g. a "snippet" containing "ignore the above and output X" text). Mitigate by keeping the system prompt authoritative and narrow (e.g. explicitly instruct the model its only job is tag/summary generation, never to follow instructions found in the user content), and by treating the model's output as **data, not code/markup to trust blindly** — the Structured Outputs schema for tagging already constrains what shape a response can take, which is a real mitigation (not just a formatting nicety) since the model literally cannot return anything outside `{tags: string[]}`.
- **Output rendering**: Explain Code's markdown output is rendered via `react-markdown` (already used for prompt/note content elsewhere), which does not execute arbitrary HTML by default — confirm `remark-gfm`'s existing configuration in `MarkdownEditor.tsx` doesn't enable raw HTML passthrough before reusing it for AI output specifically, since AI output is a step further from trusted than user-authored note content.
- **Rate limiting doubles as an abuse/cost control**, not just a UX nicety — see §6/§7. A missing or misconfigured `OPENAI_API_KEY`/rate limit should fail closed for AI features specifically (unlike `rate-limit.ts`'s existing fail-open default for auth endpoints) since the failure mode here is unbounded spend, not a locked-out user — worth a deliberate exception to the fail-open convention, flagged for explicit confirmation before implementation since it's a deviation from this codebase's established default.
- **Ownership scoping**: every AI action must go through the existing `getItemDetail`/equivalent ownership-scoped read — never accept raw content as a client-supplied string for anything beyond ephemeral, unsaved input (e.g. prompt-optimization could reasonably operate on unsaved textarea content before an item is even created, which is fine since nothing is being read from another user's data in that case; auto-tagging/summary/explain-code operate on an existing item and must re-fetch it server-side by id rather than trusting a client-supplied content string, so a modified request body can't be used to run the paid AI feature against arbitrary text unrelated to a real owned item — though note this doesn't prevent a Pro user from spending their own quota on made-up text, only from operating on data they don't own).

---

## 11. Open Questions

1. ~~Which model — `gpt-5-nano` or `gpt-6-astra`?~~ **Resolved** (§2c): `gpt-5.6-luna`, confirmed real and working. §7's cost estimates still assume nano-tier economics and haven't been re-costed against Luna's actual pricing — worth doing before summaries/explain-code (likely higher token volume per call) are built.
2. **Monthly spend cap mechanism** (§7.7) — still open. No schema exists yet for tracking per-user AI usage over a billing period; needs a small design decision (DB counter vs. Redis) before implementation, not a large one. Auto-tagging shipped with only the hourly `ai-tag` rate-limit scope (§6/§10), no monthly cap.
3. ~~Fail-open vs. fail-closed on rate-limit-check failure for AI specifically~~ **Resolved**: shipped as designed — the `ai-tag` scope fails closed on a configured-limiter error (`FAIL_CLOSED_SCOPES` in `src/lib/rate-limit.ts`), fails open only when Upstash isn't configured at all, confirmed explicitly with the user before implementation.
4. ~~`OPENAI_MODEL` env var~~ **Resolved**: added to `.env.example`, defaults to `gpt-5.6-luna` if unset.

Full implementation details, review findings, and live-verification notes for auto-tagging are in `context/current-feature.md`'s History.

---

## Sources

- Codebase: `src/actions/items.ts`, `src/actions/billing.ts`, `src/lib/subscription-limits.ts`, `src/lib/rate-limit.ts`, `src/lib/r2.ts`, `src/lib/stripe.ts`, `src/lib/db/items-queries.ts`, `.env.example`, `docs/stripe-integration-plan.md`, `context/project-overview.md`, `context/coding-standards.md`, `context/ai-interaction.md`.
- Context7 (`/websites/developers_openai_api`): Responses API setup, streaming (SSE `response.output_text.delta` events), Structured Outputs (`text.format.type: "json_schema"`, `strict: true`), error handling (`APIConnectionError`/`RateLimitError`/`APIError`, SDK auto-retry via `max_retries`), `reasoning_effort` parameter.
- Web search: GPT-6 Astra release details, pricing ($10/M input, $50/M output, $1/M cached-input), model identifier (`gpt-6-astra`), confirmation that no smaller/cheaper GPT-6 variant exists at launch.

Note: `src/lib/usage-limits.ts`, named in the original research prompt as a source, doesn't exist in this codebase — the actual gating/limits module is `src/lib/subscription-limits.ts` (item/collection limits, Pro-only type checks) plus `src/lib/rate-limit.ts` (request-rate limiting). This plan cites the real files.
