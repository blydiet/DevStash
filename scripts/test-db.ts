import { loadEnvFile } from "node:process";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "../src/generated/prisma/client.js";

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

const DEMO_EMAIL = "demo@devstash.io";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const userCount = await prisma.user.count();
    console.log(`Connected to the database. User count: ${userCount}`);

    const itemTypeCount = await prisma.itemType.count({ where: { isSystem: true } });
    console.log(`System item types: ${itemTypeCount}`);

    const demoUser = await prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
      include: {
        collections: {
          orderBy: { name: "asc" },
          include: {
            items: {
              orderBy: { item: { title: "asc" } },
              include: { item: { include: { type: true } } },
            },
          },
        },
      },
    });

    if (!demoUser) {
      console.log(`No demo user found (${DEMO_EMAIL}). Run "npm run db:seed" first.`);
      return;
    }

    console.log(`\nDemo user: ${demoUser.name} <${demoUser.email}> (isPro: ${demoUser.isPro})`);

    for (const collection of demoUser.collections) {
      console.log(`\n- ${collection.name} (${collection.items.length} items)`);
      for (const { item } of collection.items) {
        console.log(`    [${item.type.name}] ${item.title}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Database connection test failed:", error);
  process.exitCode = 1;
});
