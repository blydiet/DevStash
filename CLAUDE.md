# DevStash

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.

**IMPORTANT:** Do not add Claude to any commit messages

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Neon MCP (Database)

- Project: `devstash-dev` (id: `silent-wind-21391526`)
- Always use the **`development`** branch (id: `br-fragrant-tooth-awtihnfl`) for any Neon MCP queries or actions — pass `branchId: "br-fragrant-tooth-awtihnfl"` explicitly on every call.
- **Never** run anything against the **`production`** branch (id: `br-super-fog-awssjkae`) unless I explicitly say "production."
- ⚠️ `production` is Neon's *default* branch (`primary`/`default` = true), so omitting `branchId` will silently hit production — never omit it.
- Treat any destructive SQL (`DROP`, `DELETE`, `TRUNCATE`, unfiltered `UPDATE`) as requiring my explicit confirmation first, regardless of branch.

## Environment Variables

See `.env.example` for the full list of required/optional variables and what each is for. Copy it to `.env` (never committed — see `.gitignore`) and fill in real values.

## Commands

```bash
npm run dev           # start dev server (Turbopack, stable by default in Next 16) at localhost:3000
npm run build         # production build (Turbopack by default; fails if a webpack config is present — see below)
npm run start         # serve the production build
npm run lint          # ESLint via eslint-config-next (flat config)
npm run test          # unit tests via Vitest (src/actions/ and src/lib/ only — see context/ai-interaction.md)
npm run test:watch    # unit tests in watch mode
npm run test:coverage # unit tests with a coverage report
npm run test:e2e      # Playwright E2E tests (e2e/, browser-driven CRUD flows against the demo user)
npm run test:e2e:ui   # Playwright E2E tests in interactive UI mode
```
