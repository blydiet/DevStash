# Item Types

DevStash ships with 7 built-in ("system") item types, seeded via `prisma/seed.ts` and defined by the `ItemType` model in `prisma/schema.prisma`. All 7 exist as real `ItemType` rows (`isSystem: true`, `userId: null`) rather than a hardcoded enum — custom (Pro) item types reuse the same table with `isSystem: false` and a `userId`.

## The 7 types

| Type | Icon (Lucide) | Color | Purpose | Classification |
| --- | --- | --- | --- | --- |
| Snippet | `Code` | `#3b82f6` (blue) | Reusable code snippets (hooks, utilities, config blocks) | text |
| Prompt | `Sparkles` | `#8b5cf6` (violet) | AI prompt templates | text |
| Command | `Terminal` | `#f97316` (orange) | Shell / CLI commands | text |
| Note | `StickyNote` | `#fde047` (yellow) | Freeform markdown notes | text |
| File | `File` | `#6b7280` (gray) | Uploaded file attachments | file — **Pro-only** |
| Image | `Image` | `#ec4899` (pink) | Uploaded images | file — **Pro-only** |
| Link | `Link` | `#10b981` (green) | Saved URLs | url |

Source: `SYSTEM_ITEM_TYPES` in `prisma/seed.ts:16-24`.

### Pro gating

File and Image are the only two types currently gated behind Pro in the UI: `Sidebar.tsx:114-118` renders an outline "Pro" badge next to those two type rows specifically (`type.name === "file" || type.name === "image"`), matching the Free-tier limits described in `context/project-overview.md` ("File uploads... " listed as a Pro feature). No other type carries this badge, and there is no App-level enforcement yet (e.g. blocking Free users from creating file/image items) — it's a visual signal only, based on current code.

### Icon lookup gap

`src/lib/icon-map.ts` maps icon *names* (strings stored on `ItemType.icon`) to Lucide components: `Code2`, `Code`, `Sparkles`, `Terminal`, `StickyNote`, `File`, `Image`, `Link`. All 7 seeded icon names have a direct entry. Any `ItemType.icon` value not in this map (e.g. a custom Pro type with a typo'd icon name) silently falls back to a generic `Folder` icon wherever `iconMap[...] ?? Folder` is used (`Sidebar.tsx:104`, `ItemRow.tsx:15` falls back to `File` instead).

## Data model

Item types are **not** an enum on `Item` — every `Item` has a `typeId` foreign key to an `ItemType` row (`prisma/schema.prisma:89-90`, `onDelete: Restrict` so a type can't be deleted while items reference it). The distinguishing behavior per type lives in the `ItemType` row's `icon`/`color`, not in `Item` itself.

### Shared `Item` fields (all types)

Every item — regardless of type — has the same schema shape:

- `title` (required)
- `description` (optional)
- `contentType`: `"text" | "file"` (see classification below — note this is two-valued, not three, see gap below)
- `content`: used for text-based types
- `fileUrl` / `fileName` / `fileSize`: used for file-based types
- `url`: used for link items
- `language`: optional, for syntax highlighting (used by Snippet/Command)
- `isFavorite`, `isPinned`: boolean flags, shared UI treatment (star / pin icon) across all types
- `typeId`, `collectionId`, `tags` (via `ItemTag`): relational, shared across all types

### Text vs. file vs. URL classification

The spec in `context/project-overview.md` and the `Item.contentType` field comment (`"text" | "file"`) describe two content-storage modes, but in practice there are **three** functional groups based on which fields are actually populated:

| Group | Types | Populated fields | `contentType` seen in seed data |
| --- | --- | --- | --- |
| Text | Snippet, Prompt, Command, Note | `content` (+ `language` for Snippet/Command) | `"text"` |
| File | File, Image | `fileUrl`, `fileName`, `fileSize` | *(not present in seed data — no File/Image items are seeded)* |
| URL | Link | `url` | `"text"` in seed data (see gap below) |

**Gap:** `prisma/seed.ts` sets `contentType: "text"` on every seeded Link item (e.g. `typeIdByName.link` items at lines 244-258, 321-351), even though Link items actually populate `url`, not `content`. This means `contentType` as currently seeded doesn't reliably distinguish "URL" items from "text" items — a consumer would need to check `item.url !== null` instead of trusting `contentType` for that distinction. No File/Image items exist in seed data, so the `"file"` value of `contentType` has never actually been exercised.

### Display differences

- **Border/accent color**: every list surface (dashboard items, `ItemRow.tsx`; collections, `CollectionCard.tsx`/`Sidebar.tsx`) colors itself from the item's (or collection's dominant item's) `ItemType.color` — a single shared mechanism, not per-type branching logic.
- **Icon**: same pattern — resolved once via `iconMap[type.icon]`, no per-type special-casing in components.
- **Pro badge**: only File and Image get the sidebar "Pro" badge (see above).
- **No type-specific renderers yet**: there is no item detail/editor UI in the codebase yet (no component reads `language`, `fileUrl`, or `url` for display) — list views (`ItemRow.tsx`, `src/lib/db/items.ts`'s `ItemSummary`) only surface `title`, `description`, `tags`, `isFavorite`/`isPinned`, `createdAt`, and the type's `icon`/`color`. Type-specific rendering (syntax-highlighted code for Snippet/Command, thumbnail for Image, favicon/preview for Link, etc.) is not yet implemented.

## Sources consulted

- `context/project-overview.md` — product spec (7 types, Pro-gating of custom types/file uploads)
- `prisma/schema.prisma` — `Item` and `ItemType` models
- `prisma/seed.ts` — canonical list of the 7 system types (name/icon/color) and example item data per type
- `src/lib/icon-map.ts` — icon name → Lucide component map (actual file; `src/lib/constants.tsx` referenced in the research prompt does not exist in this codebase)
- `src/components/dashboard/Sidebar.tsx`, `src/components/dashboard/ItemRow.tsx` — display logic (color/icon resolution, Pro badge)
- `src/lib/db/items.ts`, `src/lib/db/collections.ts` — what fields are actually fetched/shaped for the UI today
