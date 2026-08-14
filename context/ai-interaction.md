# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in the project spec
- Never delete files without clarification

## Workflow

This is the common workflow that we will use for every single feature/fix:

1. **Document** - Document the feature in @context/current-feature.md.
2. **Branch** - Create new branch for feature, fix, etc
3. **Implement** - Implement the feature/fix that I create in @context/current-feature.md
4. **Test** - Verify it works in the browser. If the feature/fix touches a Server Action (`src/actions/`) or a utility (`src/lib/`), write/update unit tests for it (see Unit Testing below) and run `npm run test`. Run `npm run build` and fix any errors
5. **Iterate** - Iterate and change things if needed
6. **Commit** - Only after build passes and everything works
7. **Merge** - Merge to main
8. **Delete Branch** - Delete branch after merge
9. **Review** - Review AI-generated code periodically and on demand.
10. Mark as completed in @context/current-feature.md and add to history

Do NOT commit without permission and until the build passes. If build fails, fix the issues first.

## Unit Testing

We use Vitest (`npm run test` / `npm run test:watch` / `npm run test:coverage`). Config: `vitest.config.ts`.

- **Scope:** only Server Actions (`src/actions/`) and utilities/lib code (`src/lib/`). No component/UI testing (no React Testing Library) — browser verification covers that.
- **Location:** colocated `*.test.ts` next to the file under test (e.g. `src/lib/rate-limit.ts` → `src/lib/rate-limit.test.ts`).
- **Isolation:** mock Prisma (`@/lib/prisma`) and external services (`@/lib/email`, `@/auth`, `next-auth`, `next/headers`, `next/navigation`, `bcryptjs`, etc.) at the module boundary with `vi.mock` — tests must not hit the real dev Neon DB, Resend, or Upstash. Use `vi.hoisted` to define mock fns/classes referenced inside `vi.mock` factories.
- Run `npm run test` alongside `npm run build`/`npm run lint`/`tsc --noEmit` before marking a feature/fix ready to commit.

## Branching

We will create a new branch for every feature/fix. Name branch **feature/[feature]** or **fix[fix]**, etc. Ask to delete the branch once merged.

## Commits

- Ask before committing (don't auto-commit)
- Use conventional commit messages (feat:, fix:, chore:, etc.)
- Keep commits focused (one feature/fix per commit)
- Never put "Generated With Claude" in the commit messages

## When Stuck

- If something isn't working after 2-3 attempts, stop and explain the issue
- Don't keep trying random fixes
- Ask for clarification if requirements are unclear

## Code Changes

- Make minimal changes to accomplish the task
- Don't refactor unrelated code unless asked
- Don't add "nice to have" features
- Preserve existing patterns in the codebase

## Code Review

Review AI-generated code periodically, especially for:

- Security (auth checks, input validation)
- Performance (unnecessary re-renders, N+1 queries)
- Logic errors (edge cases)
- Patterns (matches existing codebase?)
