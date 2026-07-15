## Current Feature

Dashboard UI — Phase 1 of 3. Initial ShadCN setup, dashboard route, and layout scaffold (no real interactivity yet).

## Status

Completed

## Goals

<!-- Goals and requirements -->

- [x] ShadCN UI initialization and components
- [x] ShadCN component installation
- [x] Dashboard route at /dashboard
- [x] Main dashboard layout and any global styles
- [x] Dark mode by default
- [x] Top bar with search and new item button (display only)
- [x] Placeholder for sidebar and main area (h2 "Sidebar" and "Main" only)

## Notes

- References: @context/screenshots/dashboard-ui-main.png, @context/project-overview.md, @src/lib/mock-data.ts
- Part of a 3-phase dashboard build: @context/features/dashboard-phase-2-spec.md, @context/features/dashboard-phase-3-spec.md
- `src/lib/mock-data.ts` (currentUser, itemTypes, collections, items) already created and available to import.
- Implemented on branch `feature/dashboard-phase-1`: ShadCN init (base-nova preset), components (button, input, card, badge, separator, avatar, sheet, dropdown-menu), `TopBar` component at `src/components/dashboard/TopBar.tsx`, and `/dashboard` route with placeholder sidebar/main. `npm run build` and `npm run lint` both pass.

## History

<!-- Keep this updated. Earliest ot latest -->

- 2026-07-15: Phase 1 (ShadCN setup, /dashboard route, top bar, sidebar/main placeholders) implemented and verified. Ready to commit and merge.
