import { loadEnvFile } from "node:process";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { DEMO_USER_EMAIL } from "../src/lib/demo-user";

// Load env vars ourselves — this script runs standalone, outside Next.js's automatic loading.
// .env.local (optional, gitignored) is loaded first since loadEnvFile() never
// overwrites a key already present in process.env — the file that should win
// (.env.local) has to go first.
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

neonConfig.webSocketConstructor = ws;

// Deletes every user except DEMO_USER_EMAIL, along with all of their content
// (items, collections, tags, custom item types, accounts, sessions — via the
// schema's onDelete: Cascade rules on each relation's userId).
//
// Dry-run by default. Pass --confirm to actually delete.
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const shouldDelete = process.argv.includes("--confirm");

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const usersToDelete = await prisma.user.findMany({
      where: { email: { not: DEMO_USER_EMAIL } },
      select: {
        id: true,
        email: true,
        _count: { select: { items: true, collections: true, tags: true, itemTypes: true } },
      },
    });

    if (usersToDelete.length === 0) {
      console.log("No users to delete — only the demo user exists.");
      return;
    }

    console.log(`${shouldDelete ? "Deleting" : "Would delete"} ${usersToDelete.length} user(s):\n`);
    for (const user of usersToDelete) {
      console.log(
        `- ${user.email} (${user._count.items} items, ${user._count.collections} collections, ` +
          `${user._count.tags} tags, ${user._count.itemTypes} custom item types)`
      );
    }

    if (!shouldDelete) {
      console.log("\nDry run only — pass --confirm to actually delete these users and their content.");
      return;
    }

    const result = await prisma.user.deleteMany({
      where: { email: { not: DEMO_USER_EMAIL } },
    });
    console.log(`\nDeleted ${result.count} user(s) and all their content.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to delete non-demo users:", error);
  process.exitCode = 1;
});
