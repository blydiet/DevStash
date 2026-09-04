# Homepage

## Overview

Replace the placeholder `src/app/page.tsx` (`<h1>DevStash</h1>`) with the real marketing homepage, built from the approved mockup at `prototypes/homepage/`. Same content and structure as the mockup, rebuilt as Next.js server/client components with Tailwind v4 + ShadCN instead of plain HTML/CSS/vanilla JS.

## Route & Layout

- `src/app/page.tsx` (`/`) — public, not behind auth.
- If a session exists, `redirect("/dashboard")` at the top of the page (server-side), matching the existing `/sign-in` and `/register` "already signed in" pattern.
- Not wrapped in `DashboardShell`/`Sidebar` — this page has its own nav and footer, full-bleed, independent of the dashboard chrome.
- Add `/` to `proxy.ts` only if needed — it isn't currently protected, so no change required there.

## Components

New directory `src/components/homepage/`, one file per section, following the project's `[feature]/ComponentName.tsx` convention:

| Component | Type | Notes |
|---|---|---|
| `HomeNav.tsx` | Client | Fixed nav; background/blur opacity on scroll (`IntersectionObserver` on a top sentinel, not a scroll listener) |
| `HeroSection.tsx` | Server | Headline, subtext, CTA buttons |
| `HeroVisual.tsx` | Client | Chaos box, transform arrow, order box — owns the chaos-icon animation loop |
| `FeaturesSection.tsx` | Server | 6-card bento grid |
| `AiSection.tsx` | Server | Pro badge, checklist, static editor mock (code block, tag chips) |
| `PricingSection.tsx` | Server | Section shell + both price cards (static content) |
| `BillingToggle.tsx` | Client | Monthly/yearly switch; lifts `isYearly` state and passes derived price text down to the two price cards it wraps |
| `CtaSection.tsx` | Server | Closing CTA banner |
| `HomeFooter.tsx` | Server | Logo, link columns, copyright (`new Date().getFullYear()`, server-rendered) |
| `Reveal.tsx` | Client | Thin wrapper: `IntersectionObserver` + spring-in animation on enter, replaces the mockup's `.reveal` class; wraps each section/card individually |

`AiSection`'s tag-chip pop-in and `PricingSection`'s "Most popular" styling are pure CSS/Tailwind (no JS needed beyond `Reveal` triggering the section in).

## Animations

Port the mechanics from `prototypes/homepage/script.js`, not the file itself:

- **Spring engine**: a small mass-spring-damper helper (`src/lib/homepage/spring.ts`) reused by `Reveal` (entrance) and by hover/press interactions on buttons and feature cards.
- **Chaos icons**: `HeroVisual.tsx` runs the drift/wall-bounce/cursor-repel loop via `requestAnimationFrame` in a `useEffect`, driving icon positions through refs (not React state) to avoid re-rendering every frame — same approach the mockup uses, adapted to a ref-per-icon instead of raw DOM nodes.
- **Arrow pulse**, **nav scroll opacity**, **billing toggle knob**: CSS/Tailwind transitions, same as the mockup.
- Respect `prefers-reduced-motion`: reveal/spring/chaos-drift should no-op (final visible state, no animation) when set — same as the mockup's existing `@media (prefers-reduced-motion: reduce)` blocks.

## Visual System

- Reuse the app's real item-type colors from `src/lib/item-types.ts` (`ITEM_TYPES`) for every place the mockup uses a per-type accent (chaos-to-order dashboard preview, feature card accents, type-dot strip, AI tag chips) — **not** the mockup's own hardcoded hex values, which drifted from the app's actual palette (e.g. mockup prompt `#f59e0b` vs. app's `#8b5cf6`). Pass the color the same way `ItemCard.tsx` already does: inline `style={{ "--accent": type.color }}`.
- Icons: use `lucide-react` (already a dependency) in place of the mockup's Phosphor CDN icons throughout — `package`, `code`, `sparkle`, `magnifying-glass`, `terminal`, `file-text`, `squares-four`, `check-circle`, `arrow-right`, `check`, etc. all have direct lucide equivalents.
- Chaos-box brand logos (Notion, GitHub, Discord, Sublime Text): self-host as SVGs under `public/logos/` instead of the mockup's Simple Icons CDN link, so the page has no runtime third-party dependency. The other 4 chaos icons (browser tabs, terminal, text file, bookmark) use `lucide-react`.
- Fonts: self-host Space Grotesk + JetBrains Mono via `next/font/local` (files already in `prototypes/homepage/fonts/`, move to `src/app/fonts/` or similar), scoped to this route only (e.g. applied via a class on the homepage's own wrapper) — do not change the Geist fonts used by the rest of the app.
- Dark-theme surface tokens (`--bg`, `--bg-card`, `--border`, `--text-secondary`, etc.) and the two accent steps (`--accent` / `--accent-solid`) from `styles.css` map onto Tailwind arbitrary values or a small set of custom properties scoped to this page — do not touch the shared ShadCN tokens in `globals.css`, which the dashboard depends on.

## Navigation Map

| Element | Destination |
|---|---|
| Nav logo | `/` |
| Nav "Features" | `#features` (in-page) |
| Nav "Pricing" | `#pricing` (in-page) |
| Nav "Sign in" | `/sign-in` |
| Nav "Get started" | `/register` |
| Hero "Get started" | `/register` |
| Hero "See how it works" | `#features` (in-page) |
| Free card "Get started" | `/register` |
| Pro card "Get started" | `/register` — Stripe checkout isn't built yet (see Roadmap), so this goes to registration for now, same as Free; revisit once billing exists |
| Closing CTA "Get started" | `/register` |
| Footer "Product" column | `#features`, `#pricing` |
| Footer "Account" column | `/sign-in`, `/register` (replaces the mockup's placeholder Company/Legal columns) |

Drop the mockup's "Company" (About/Contact) and "Legal" (Privacy/Terms) footer columns — there are no corresponding pages in the app, and the instruction is for links to go somewhere real rather than be faked as `href="#"`.

## Out of Scope

- Stripe checkout wiring for the Pro CTA.
- About/Contact/Privacy/Terms pages.
- Any change to `/dashboard` or its components.
