import { loadEnvFile } from "node:process";
import { defineConfig, env } from "prisma/config";

// Match Next.js's env file precedence: .env.local overrides .env.
// loadEnvFile() never overwrites a key already present in process.env, so the
// file that should win is loaded first. Both files are optional: on platforms
// like Vercel, env vars are injected directly into process.env and neither
// file exists on disk.
try {
  loadEnvFile(".env.local");
} catch {
  // .env.local is optional
}
try {
  loadEnvFile(".env");
} catch {
  // .env is optional (e.g. not present in deployed environments)
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // The Prisma CLI (migrate/introspect) needs a direct, non-pooled connection —
  // it holds session state (advisory locks) across statements, which a pooled
  // PgBouncer connection can't guarantee. DATABASE_URL (the "-pooler" host) is
  // still what the app's own Prisma Client uses at runtime via @prisma/adapter-neon,
  // unaffected by this — see docs/prisma.io: pgbouncer.mdx / neon.tech: prisma-migrations.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
