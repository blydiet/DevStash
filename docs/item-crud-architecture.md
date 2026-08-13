# Item CRUD Architecture

Design for a unified create/read/update/delete system covering all 7 item types (Snippet, Prompt, Command, Note, File, Image, Link — see [item-types.md](./item-types.md)). Nothing here is implemented yet; this documents the intended shape before the feature is built, following the file-organization and data-fetching rules in `context/coding-standards.md` and the patterns already established by the auth/profile/collections code.

## Guiding constraint

There is exactly **one** `Item` model (`prisma/schema.prisma:72-103`) for all 7 types — type is a `typeId` foreign key, not a discriminated union at the schema level. The CRUD system should mirror that: one set of mutations, one query module, one dynamic route, one card/row component — with type-specific behavior expressed as small conditionals on `type.name` or the text/file/url grouping documented in `item-types.md`, not as 7 parallel implementations.

## File structure

| Concern | Location | Pattern source |
| --- | --- | --- |
| Mutations (create/update/delete/toggle) | `src/actions/items.ts` (new) | `src/actions/profile.ts`, `src/actions/auth.ts` — `"use server"`, one exported async function per mutation |
| Validation schemas | `src/lib/validations/items.ts` (new) | `src/lib/validations/auth.ts` — one `z.object` per mutation shape, `.refine()` for cross-field rules |
| Data fetching (queries) | `src/lib/db/items.ts` (existing, extend) | Already holds `getPinnedItems`, `getRecentItems`, `getItemStats`, `getItemTypes` (`src/lib/db/items.ts:55-110`) — add `getItemsByType`, `getItemById` alongside these, same file |
| Route | `src/app/items/[type]/page.tsx` (new) | One dynamic segment for all 7 types, matching the `/items/${type.name.toLowerCase()}` links already emitted by `Sidebar.tsx:108` |
| Result/action types | `src/types/items.ts` (new) | `src/types/auth.ts` — `{ success, error? }`-shaped interfaces per the coding standards' Error Handling section |
| Components | `src/components/items/` (new) | Sibling to `src/components/dashboard/`, `src/components/profile/` |

Mutations and queries stay in separate files by existing convention: every server component in this codebase calls `lib/db` functions directly (`getPinnedItems()` in a server component, no action involved), while every mutation goes through `src/actions/*.ts` regardless of whether it's triggered by a Server Action form or a client `onClick`. `src/actions/items.ts` should call into `src/lib/db/items.ts` for the actual Prisma writes (or write inline with `prisma` directly, consistent with how `src/actions/profile.ts` calls `prisma.user.update` inline rather than through a `lib/db` helper) — either is precedented; inline is slightly more consistent with `profile.ts` for single-row writes, a `lib/db` helper is worth it if the same write is needed from more than one action.

### Proposed `src/actions/items.ts` surface

- `createItem(input)` — validates via a `createItemSchema` keyed by the text/file/url grouping, inserts, revalidates `/items/[type]` and `/dashboard`
- `updateItem(id, input)` — ownership-checked (`where: { id, userId }`, matching the `userId`-scoped pattern every existing query uses via `getCurrentUserId()` in `src/lib/db/user.ts`), same validation schema as create minus required-ness where appropriate
- `deleteItem(id)` — ownership-checked delete; no cascade concerns since `Item` is a leaf model relative to `ItemTag`/`ItemTag.onDelete: Cascade` (`prisma/schema.prisma:151`)
- `toggleFavorite(id)`, `togglePinned(id)` — small dedicated mutations rather than folding into `updateItem`, mirroring how `isFavorite`/`isPinned` are read as first-class fields everywhere else in the codebase (`ItemRow.tsx:32-35`)

All should return the existing `{ success: boolean; error?: string }` shape (`src/types/auth.ts:1-16`) rather than throwing, per the coding standards' `{ success, data, error }` convention.

## How `/items/[type]` routing works

- Single dynamic route: `src/app/items/[type]/page.tsx`, `type` is the lowercased `ItemType.name` (`"snippet"`, `"prompt"`, …), matching what `Sidebar.tsx:108` already links to.
- The page resolves `type` to an `ItemType` row (new `getItemTypeByName(name)` in `src/lib/db/items.ts`, following the same `getCurrentUserId()`-scoped pattern) and 404s via `notFound()` if it doesn't match a known type — this also naturally handles custom Pro types once those exist, without a second route.
- Server component, no `"use client"` at the page level — same rule as every other page in this codebase (dashboard, profile). It fetches `getItemsByType(typeId)` directly, no API route needed (this is in-app data, not a webhook or third-party integration — per the "Use API routes when..." list in `context/coding-standards.md`, none of those conditions apply here).
- Item creation is a modal/dialog opened from this page (`Dialog` from `src/components/ui/dialog`, same primitive `AccountActions.tsx:9-17`/`78-116` already uses for change-password), not a separate `/items/[type]/new` route — keeps the "one dynamic route" goal intact and matches this codebase's existing preference for dialogs over dedicated create pages (seen in the profile change-password and delete-account flows).
- Editing an existing item: also a dialog, opened from the row/card, pre-filled with that item's data — same `ItemForm` component reused for create and edit (see below), avoiding a second `[id]` route for the MVP. An item detail page isn't in scope yet (per `item-types.md`'s note that no item detail/editor UI exists in the codebase yet).
- `src/proxy.ts:19`'s matcher (`["/dashboard/:path*", "/profile/:path*"]`) will need `/items/:path*` added — currently `/items/*` is unprotected, which is a gap this design surfaces but doesn't fix (out of scope for a research/documentation task).

## Where type-specific logic lives (components, not actions)

Per the research goal, actions and db queries stay type-agnostic — they operate on the shared `Item` fields (`title`, `description`, `content`, `fileUrl`/`fileName`/`fileSize`, `url`, `language`, `typeId`, `collectionId`, `isFavorite`, `isPinned`) regardless of which type is being written. `createItem`/`updateItem` accept whatever fields are populated and let the schema/Prisma write them; they don't branch on `type.name`.

All per-type differences live in components:

- **`ItemForm.tsx`** (client component, used for both create and edit) branches on the type's group (text / file / url, from `item-types.md`'s classification) to decide which fields to render:
  - Text group (Snippet, Prompt, Command, Note) → `content` textarea, `language` select shown only for Snippet/Command
  - File group (File, Image) → file upload input, writing `fileUrl`/`fileName`/`fileSize` (actual upload mechanics to Cloudflare R2 are out of scope for this doc — `context/project-overview.md`'s open question on file size/type limits is still unresolved)
  - URL group (Link) → `url` input
  - Fields common to every type (`title`, `description`, tags, collection picker) always render
  - This is the one place that needs to change when a type's shape changes or a custom Pro type is added — everything else (actions, queries, route) stays untouched
- **`ItemCard.tsx` / reused `ItemRow.tsx`** — icon/color resolution already goes through the shared `iconMap[type.icon] ?? File` + `type.color` mechanism (`ItemRow.tsx:15,20,27`), no per-type branching needed here; this pattern extends directly to a type-filtered list.
- **Pro gating** — `File`/`Image` are the only types requiring a Pro check before allowing create (`isPro` on `User`, per `context/project-overview.md`'s Free/Pro table). This check belongs in `ItemForm.tsx` (disable/hide the file-upload path for non-Pro users) and should be re-checked in `createItem` itself (server-side, not just hidden in the UI) — the existing codebase has no precedent yet for a Pro-gate check in an action, so this would be new: a `session.user` → `prisma.user.findUnique({ select: { isPro }})` check before permitting `typeId` to resolve to File/Image, mirroring the ownership checks already used elsewhere.

## Component responsibilities

| Component | Type | Responsibility |
| --- | --- | --- |
| `src/app/items/[type]/page.tsx` | Server | Resolve `type` param → `ItemType`, fetch items via `getItemsByType`, render list + "New item" trigger |
| `ItemList.tsx` (new) | Server | Map `ItemSummary[]` to `ItemRow`/`ItemCard`; empty-state message when a type has 0 items |
| `ItemRow.tsx` (existing, reusable as-is) | Server | Read-only row: icon/color from type, title/description/tags/date, pin/favorite indicators — already type-agnostic, no changes needed for this feature |
| `ItemForm.tsx` (new) | Client | Create/edit dialog; the only component that branches on type group; calls `createItem`/`updateItem` |
| `ItemActions.tsx` (new, or inlined into `ItemRow`) | Client | Per-row favorite/pin toggle buttons and a delete confirmation (`AlertDialog`, same primitive as `AccountActions.tsx:119-140`'s delete-account flow) |
| `src/actions/items.ts` | Server (`"use server"`) | Validate, authorize (ownership + Pro gate for File/Image), write, revalidate — no type-specific field logic |
| `src/lib/db/items.ts` | Server-only module | All reads; extend with `getItemsByType`, `getItemById`, `getItemTypeByName` alongside the existing four exports |

## Sources consulted

- `context/project-overview.md` — product spec (7 types, Free/Pro limits, data model draft)
- `docs/item-types.md` — canonical type classification (text/file/url groups), icon/color mechanism, Pro-gating precedent, and the note that no item detail/editor UI exists yet
- `prisma/schema.prisma` — `Item`/`ItemType` models, cascade/restrict rules
- `src/lib/db/items.ts`, `src/lib/db/collections.ts` — existing query patterns (`getCurrentUserId()`-scoped, `cache()` usage, `select`-not-`include` for over-fetch avoidance)
- `src/actions/profile.ts`, `src/actions/auth.ts` — existing mutation/action patterns and result-object shape
- `src/components/dashboard/ItemRow.tsx`, `Sidebar.tsx` — existing type-agnostic display logic and the `/items/${type.name.toLowerCase()}` links this route needs to satisfy
- `src/components/profile/AccountActions.tsx` — existing `Dialog`/`AlertDialog` usage precedent for create/edit/delete UI
- `src/proxy.ts` — current route-protection matcher (gap: `/items` not yet included)
- `src/types/auth.ts`, `src/lib/validations/auth.ts` — existing action-result and Zod schema conventions
- Note: `src/lib/constants.tsx`, referenced in the original research prompt, does not exist in this codebase — `src/lib/icon-map.ts` is the actual icon-resolution module (same gap already noted in `item-types.md`)
