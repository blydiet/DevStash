import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Match Next.js's env file precedence: .env, then .env.local overrides it.
config();
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
