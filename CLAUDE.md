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

Required in `.env` (never committed — see `.gitignore`):

- `DATABASE_URL` — Neon Postgres connection string (direct, non-pooler — required for `prisma migrate`)
- `AUTH_SECRET` — NextAuth v5 secret, generate with `npx auth secret`
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — GitHub OAuth App credentials (https://github.com/settings/developers)
- `RESEND_API_KEY` — Resend API key, used for verification emails on register (https://resend.com/api-keys)
- `EMAIL_VERIFICATION_ENABLED` — optional, defaults to enabled. Set to `"false"` to disable the email-verification requirement entirely (skips sending on register, skips the block on sign-in, auto-verifies new users) — useful in this environment since no Resend domain is verified yet, so real delivery only works to the Resend account's own address

## Commands

```bash
npm run dev      # start dev server (Turbopack, stable by default in Next 16) at localhost:3000
npm run build    # production build (Turbopack by default; fails if a webpack config is present — see below)
npm run start    # serve the production build
npm run lint     # ESLint via eslint-config-next (flat config)
```
