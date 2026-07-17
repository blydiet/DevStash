## Current Feature

Dashboard UI — Phase 3 of 3. Main dashboard content area: stats cards, recent collections, pinned items, and recent items.

## Status

In Progress

## Goals

<!-- Goals and requirements -->

- [ ] Main area to the right
- [ ] Recent collections
- [ ] Pinned items
- [ ] 10 recent items
- [ ] 4 stats cards at the top (number of items, collections, favorite items, favorite collections — not in screenshot)

## Notes

- References: @context/features/dashboard-phase-3-spec.md, @context/screenshots/dashboard-ui-main.png, @context/project-overview.md, @src/lib/mock-data.ts
- Part of a 3-phase dashboard build: @context/features/dashboard-phase-1-spec.md (done), @context/features/dashboard-phase-2-spec.md (done)
- `src/lib/mock-data.ts` (currentUser, itemTypes, collections, items) already created and available to import.

## History

<!-- Keep this updated. Earliest ot latest -->

- 2026-07-15: Phase 1 (ShadCN setup, /dashboard route, top bar, sidebar/main placeholders) implemented and verified on branch `feature/dashboard-phase-1`. Committed and merged.
- 2026-07-16: Phase 2 (collapsible sidebar with item-type links, favorite/all collections, user avatar footer, desktop collapse + mobile drawer toggle) implemented on branch `feature/dashboard-phase-2`. Verified in-browser (desktop collapse, section collapse, mobile drawer) with no console errors; `npm run build` and `npm run lint` both pass. Ready to commit and merge.
