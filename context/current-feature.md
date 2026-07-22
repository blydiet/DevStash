## Current Feature

None. Dashboard Collections is complete — see history below.

## Status

Completed

## Goals

<!-- Goals and requirements -->

- Create `src/lib/db/collections.ts` with data fetching functions
- Fetch collections directly in server component
- Collection card border color derived from most-used content type in that collection
- Show small icons of all types in that collection
- Keep the current design (reference `@context/screenshots/dashboard-ui-main.png` if needed — layout/design is already there)
- Update collection stats display

## Notes

## History

<!-- Keep this updated. Earliest ot latest -->

- 2026-07-15: Phase 1 (ShadCN setup, /dashboard route, top bar, sidebar/main placeholders) implemented and verified on branch `feature/dashboard-phase-1`. Committed and merged.
- 2026-07-16: Phase 2 (collapsible sidebar with item-type links, favorite/all collections, user avatar footer, desktop collapse + mobile drawer toggle) implemented on branch `feature/dashboard-phase-2`. Verified in-browser (desktop collapse, section collapse, mobile drawer) with no console errors; `npm run build` and `npm run lint` both pass. Committed and merged; branch deleted (local + remote).
- 2026-07-17: Phase 3 (stats cards, recent collections, pinned items, 10 recent items; stats card icon colors aligned to the existing collection/type palette) implemented on branch `feature/dashboard-phase-3`. Verified in-browser with no console errors; `npm run build` and `npm run lint` both pass. Committed and merged; branch deleted (local + remote). Dashboard UI 3-phase build complete.
- 2026-07-20/21: Prisma 7 + Neon PostgreSQL setup implemented on branch `feature/prisma-neon-setup`. Hit and resolved a real blocker: Prisma 7 requires Node 20.19+/22.12+/24+, machine had v20.15.1 — installed current Node (v26.5.0) via Homebrew with user approval. Added `prisma.config.ts` (Prisma 7's config format, loading `.env` then `.env.local`), `prisma/schema.prisma` (full data model from project-overview.md plus NextAuth's `Account`/`Session`/`VerificationToken`, with explicit cascade rules and indexes on all FK/lookup columns), `src/lib/prisma.ts` (client singleton using `@prisma/adapter-neon` with the dev-mode global-singleton guard), and `.env.example`/`.gitignore` updates. Set `package.json` `"type": "module"` (required by Prisma 7's ESM-only client). Ran `prisma migrate dev --name init` against the real dev Neon branch (not `db push`) — created `prisma/migrations/20260720213954_init/`, all 9 tables confirmed, `prisma migrate status` reports in sync. `npm run build` and `npm run lint` both pass. Ready to commit and merge.
- 2026-07-21: Added `scripts/test-db.ts` (standalone connectivity check, `npm run db:test`) and `prisma/seed.ts` (per @context/features/seed-spec.md, copied in from course resources) on the same `feature/prisma-neon-setup` branch. Seed creates the demo user (bcryptjs-hashed password), 7 system item types, and 5 collections with 18 items (real URLs for link items); deletes-then-recreates the demo user + system types first, so `npm run db:seed` is safe to re-run — verified by running it twice with identical output. Ran against the real dev Neon branch and confirmed via `db:test` (User count: 1). `npm run build` and `npm run lint` both pass. Ready to commit and merge.
- 2026-07-21: Extended `scripts/test-db.ts` to fetch and print the seeded demo data — system item type count, then the demo user with each collection and its items (grouped by item type). Verified against the real dev Neon branch: prints all 7 item types, 5 collections, and 18 items correctly. `npm run build` and `npm run lint` both pass.
- 2026-07-21/22: Dashboard Collections (per @context/features/dashboard-collections-spec.md) implemented on branch `feature/dashboard-collections`. Added `src/lib/db/collections.ts` (`getRecentCollections`, hardcoded to the demo user like the existing scripts since auth isn't wired up yet) computing per-collection item count, border color (from the most-used `ItemType.color` among its items), and the deduped list of item types present. Updated `RecentCollections.tsx` (now an async server component) and `CollectionCard.tsx` to consume this instead of `src/lib/mock-data.ts`. Fixed a pre-existing `icon-map.ts` gap where the seeded snippet type's icon name (`"Code"`) had no entry (only `"Code2"` did), which would've silently fallen back to a generic folder icon. Wrapped the fetch in a try/catch so a DB failure renders a visible `text-destructive` error message instead of crashing the page — verified by forcing a temporary throw and confirming the error rendered, then confirming normal data rendered again after reverting. Also caught and reverted an experimental `swr`/client-fetching detour that broke the build (RSC doesn't export `useSWR`); removed the `swr` dependency since it ended up unused. Verified in-browser: all 5 real collections render with correct item counts, type-derived border colors, and correct type icons. `npm run build`, `npm run lint`, and `tsc --noEmit` all pass. Ready to commit and merge.
