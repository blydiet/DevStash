# Refactor Scan — actions

Last scanned: 2026-09-14

## Summary

`src/actions/` (items.ts, ai.ts, auth.ts, billing.ts, editor-preferences.ts, profile.ts) has a real amount of copy-pasted boilerplate around the session-check and DB-call-then-shape-result steps. `ai.ts` already solved this once for itself (`authorizeAiCall`) but the other five files never got the same treatment. Two findings (the auth-guard duplication and the items.ts mutation skeleton) are worth extracting; the rest are smaller or judgment calls.

## Findings

### 1. The "require a session" block is duplicated 9+ times, with `ai.ts` showing the fix already

**Files**:
- `src/actions/items.ts:30-34` (createItem), `:84-88` (updateItem), `:123-127` (toggleItemFavorite), `:149-153` (updateItemContent), `:171-175` (toggleItemPin), `:193-197` (deleteItem)
- `src/actions/billing.ts:24-28` (createCheckoutSession), `:95-99` (createBillingPortalSession)
- `src/actions/profile.ts:14-18` (changePassword)
- `src/actions/editor-preferences.ts:12-16` (updateEditorPreferences, same block inside a try/catch)

**Duplicated logic**: `const session = await auth(); if (!session?.user?.id) { return { success: false, error: "Not authenticated" }; }` — the exact same 3 lines and the exact same error string, copy-pasted 9 times across 4 files. `src/actions/ai.ts:103-123` already extracted the equivalent check (plus a Pro-gate and rate-limit) into a shared `authorizeAiCall()` helper returning `{ok:true}|{ok:false,result}` — so this codebase has already validated the pattern once, just not applied it everywhere.

**Why it matters**: the literal string `"Not authenticated"` is now the load-bearing contract several client components check against (`err.message === "Not authenticated"` is called out as an established convention in this project's own feature history for `/settings`, `/upgrade`, `/favorites`). Nine independent copies means nine places that have to be kept in sync if that contract ever changes, and it's easy for a tenth new action to reimplement it slightly differently (see `profile.ts`'s `deleteAccount` below, which already has).

**Suggested extraction**: a small `requireSession()` helper (e.g. `src/lib/auth-guard.ts`) mirroring `authorizeAiCall`'s shape:
```ts
async function requireSession(): Promise<{ ok: true; userId: string } | { ok: false; result: { success: false; error: string } }>
```
Each call site becomes `const authed = await requireSession(); if (!authed.ok) return authed.result;` — collapsing ~4 lines to 2 in 9 places (~20 lines removed) and centralizing the string.

**Related smell, same root cause**: `profile.ts:51-56` (`deleteAccount`) has no return type and silently returns `undefined` on a missing session instead of an error result — the one place this check doesn't produce a consistent shape. Adopting the shared helper would surface this inconsistency and force a decision on it rather than leaving it as a quiet outlier.

### 2. `items.ts`'s single-item mutation actions share one skeleton verbatim

**Files**: `src/actions/items.ts` — `toggleItemFavorite:119-142`, `updateItemContent:148-168`, `toggleItemPin:170-190`, and `deleteItem:192-212` (same shape minus the `data` field).

**Duplicated logic**: all four are the identical sequence — session check → `let x; try { x = await dbFn(itemId, ...) } catch (err) { console.error("Failed to ...", err); return {success:false, error:"Failed to ..."} }` → `if (!x) return {success:false, error:"Item not found"}` → `return {success:true, data:x}`. The only things that differ are which `*InDb` function is called and two message strings.

**Why it matters**: ~80 lines that are structurally one function with three parameters (the DB call, and two message strings) written out four times. A future fifth toggle-style action (there's a clear precedent for adding more) will very likely be copy-pasted from one of these rather than written fresh, carrying forward any bug in the copy.

**Suggested extraction**: a generic helper in the same file:
```ts
async function mutateOwnedItem<T>(
  mutate: () => Promise<T | null>,
  failureMessage: string
): Promise<{ success: true; data: T } | { success: false; error: string }>
```
handling the try/catch + not-found + success wrapping, called after the (now-shared, per Finding 1) session check. `createItem`/`updateItem` are meaningfully different (extra validation, Pro-gating, the `dropped` warning) and shouldn't be forced into this shape.

### 3. `createItem`/`updateItem`'s inline parameter types duplicate the Zod schema's field list

**Files**: `src/actions/items.ts:17-28` (createItem's inline `data` type) and `:71-82` (updateItem's inline `data` type), vs. `src/lib/validations/items.ts:77-93` (`updateItemSchema`) and `:95-108` (`createItemSchema`).

**Duplicated logic**: both action signatures hand-list the same 10 fields (`title, description, content, url, language, fileUrl, fileName, fileSize, tags, collectionIds`) as an inline TypeScript object type — a field-for-field match of what `createItemSchema`/`updateItemSchema` already declare via Zod, one file over.

**Why it matters**: this is the exact "same rule, two places" risk this project's own comment block on `updateItemSchema` (validations/items.ts:12-20) already worries about for the schema itself — adding, renaming, or removing a field now requires touching the Zod schema *and* the matching hand-written TS type, with nothing forcing them to stay in sync (a mismatch wouldn't necessarily fail to compile, since `safeParse` accepts anything assignable to the wider hand-written type).

**Suggested extraction**: type the `data` parameters from the schemas directly — `z.input<typeof createItemSchema>` / `z.input<typeof updateItemSchema>` (input, not output, since `fileName`/`fileSize`/`fileUrl` carry `.default(null)`) — dropping the hand-written object literals entirely.

### 4. The rate-limit-check-then-early-return block is duplicated across `auth.ts`

**Files**: `src/actions/auth.ts` — `resendVerificationEmail:83-90`, `requestPasswordReset:132-137`, `resetPassword:170-175`. `src/actions/ai.ts:117-120` (inside `authorizeAiCall`) has the same shape for a fourth scope.

**Duplicated logic**: `const { success: withinLimit, reset } = await checkRateLimit(scope, key); if (!withinLimit) { return { success: false, error: rateLimitMessage(reset) }; }`, identical apart from the scope name and key expression.

**Why it matters**: smaller than Findings 1-2 (3 lines × 3-4 sites), but it's the same shape as Finding 1 and would collapse into the same kind of tiny helper — worth doing at the same time rather than separately, e.g. `checkRateLimitOrFail(scope, key)` returning `null | {success:false,error:string}`.

## Not Flagged (Considered and Rejected)

- **The try/catch-around-a-DB-call-with-console.error convention itself** (present in nearly every action) — this is the project's documented Server Action error-handling standard (`context/coding-standards.md`), not duplication to remove. Finding 2 flags the *literal* repeated skeleton in `items.ts`'s four single-field mutations specifically, not the general try/catch pattern used correctly elsewhere with genuinely different bodies (`createItem`, `updateItem`, `billing.ts`'s two Stripe calls, etc.).
- **`resendVerificationEmail` vs `requestPasswordReset`'s "don't reveal account existence" check** (`auth.ts:92-97` vs `:139-144`) — both look up a user and return a generic success on a miss, but the actual condition differs (`!user?.password || user.emailVerified` vs just `!user?.password`), and there are only two occurrences. Not enough exact overlap to extract without adding a parameter that just re-encodes the difference.
- **`billing.ts`'s two `prisma.user.findUnique` + null-check-to-"Not authenticated"` blocks** (`:48-55`, `:101-108`) — structurally close to Finding 1, but each selects a different field for a different next step (Stripe customer creation vs. portal-session lookup). Worth revisiting only if a `getAuthenticatedDbUser(select)` helper gets built for Finding 1 anyway; not a strong enough standalone case.
- **`ai.ts`'s four `generate*` OpenAI-call functions** (`generateTagSuggestions`, `generateSummary`, `generateExplanation`, `generateOptimizedPrompt`) — each builds a structurally similar `responses.create({...})` call, but the system prompt, schema, truncation cap, and token limit all genuinely differ per feature, and the file's own comments show these differences were deliberated one at a time. Forcing a shared "call OpenAI with Structured Outputs" wrapper would mostly just relocate the differences into a config object without removing real risk.
