import { loadEnvFile } from "node:process";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import bcrypt from "bcryptjs";
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

const SYSTEM_ITEM_TYPES = [
  { name: "snippet", icon: "Code", color: "#3b82f6" },
  { name: "prompt", icon: "Sparkles", color: "#8b5cf6" },
  { name: "command", icon: "Terminal", color: "#f97316" },
  { name: "note", icon: "StickyNote", color: "#fde047" },
  { name: "file", icon: "File", color: "#6b7280" },
  { name: "image", icon: "Image", color: "#ec4899" },
  { name: "link", icon: "Link", color: "#10b981" },
] as const;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // Reset previously-seeded demo data so this script is safe to re-run.
    const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
    if (existingUser) {
      await prisma.user.delete({ where: { id: existingUser.id } });
    }
    await prisma.itemType.deleteMany({ where: { isSystem: true } });

    const passwordHash = await bcrypt.hash("12345678", 12);

    const user = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "Demo User",
        password: passwordHash,
        isPro: false,
        emailVerified: new Date(),
      },
    });

    const itemTypes = await Promise.all(
      SYSTEM_ITEM_TYPES.map((type) =>
        prisma.itemType.create({
          data: { name: type.name, icon: type.icon, color: type.color, isSystem: true },
        })
      )
    );
    const typeIdByName = Object.fromEntries(itemTypes.map((t) => [t.name, t.id]));

    const reactPatterns = await prisma.collection.create({
      data: {
        userId: user.id,
        name: "React Patterns",
        description: "Reusable React patterns and hooks",
        isFavorite: true,
        items: {
          create: [
            {
              item: {
                create: {
                  userId: user.id,
                  typeId: typeIdByName.snippet,
                  title: "useDebounce Hook",
                  description: "Custom hook to debounce a rapidly changing value",
                  isFavorite: true,
                  contentType: "text",
                  language: "typescript",
                  content: `import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}
`,
                },
              },
            },
            {
              item: {
                create: {
                  userId: user.id,
                  typeId: typeIdByName.snippet,
                  title: "Compound Component Pattern",
                  description: "Context-based compound component pattern for flexible composition",
                  contentType: "text",
                  language: "typescript",
                  content: `import { createContext, useContext, useState, type ReactNode } from "react";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({ defaultTab, children }: { defaultTab: string; children: ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>{children}</TabsContext.Provider>
  );
}

export function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("useTabsContext must be used within <Tabs>");
  return context;
}
`,
                },
              },
            },
            {
              item: {
                create: {
                  userId: user.id,
                  typeId: typeIdByName.snippet,
                  title: "Array Utility Functions",
                  description: "Small collection of typed array helpers",
                  contentType: "text",
                  language: "typescript",
                  content: `export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function groupBy<T, K extends PropertyKey>(
  items: T[],
  key: (item: T) => K
): Record<K, T[]> {
  return items.reduce(
    (groups, item) => {
      const groupKey = key(item);
      (groups[groupKey] ??= []).push(item);
      return groups;
    },
    {} as Record<K, T[]>
  );
}

export function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size)
  );
}
`,
                },
              },
            },
          ],
        },
      },
    });

    const devOps = await prisma.collection.create({
      data: {
        userId: user.id,
        name: "DevOps",
        description: "Infrastructure and deployment resources",
        items: {
          create: [
            {
              item: {
                create: {
                  userId: user.id,
                  typeId: typeIdByName.snippet,
                  title: "Docker Compose Config",
                  description: "Local dev stack: app container plus Postgres",
                  contentType: "text",
                  language: "yaml",
                  content: `services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=\${DATABASE_URL}
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
`,
                },
              },
            },
            {
              item: {
                create: {
                  userId: user.id,
                  typeId: typeIdByName.command,
                  title: "Deploy to Production",
                  description: "Build and deploy the current branch straight to production",
                  contentType: "text",
                  language: "bash",
                  content: "npm run build && vercel --prod --yes",
                },
              },
            },
            {
              item: {
                create: {
                  userId: user.id,
                  typeId: typeIdByName.link,
                  title: "Docker Documentation",
                  description: "Official Docker documentation",
                  contentType: "text",
                  url: "https://docs.docker.com/",
                },
              },
            },
            {
              item: {
                create: {
                  userId: user.id,
                  typeId: typeIdByName.link,
                  title: "GitHub Actions Documentation",
                  description: "Official GitHub Actions documentation for CI/CD workflows",
                  contentType: "text",
                  url: "https://docs.github.com/en/actions",
                },
              },
            },
          ],
        },
      },
    });

    const terminalCommands = await prisma.collection.create({
      data: {
        userId: user.id,
        name: "Terminal Commands",
        description: "Useful shell commands for everyday development",
        isFavorite: true,
        items: {
          create: [
            {
              item: {
                create: {
                  userId: user.id,
                  typeId: typeIdByName.command,
                  title: "Undo Last Commit (Keep Changes)",
                  description: "Undo the last commit but keep the changes staged",
                  contentType: "text",
                  language: "bash",
                  content: "git reset --soft HEAD~1",
                },
              },
            },
            {
              item: {
                create: {
                  userId: user.id,
                  typeId: typeIdByName.command,
                  title: "Remove All Stopped Containers",
                  description: "Clean up stopped Docker containers",
                  contentType: "text",
                  language: "bash",
                  content: "docker container prune -f",
                },
              },
            },
            {
              item: {
                create: {
                  userId: user.id,
                  typeId: typeIdByName.command,
                  title: "Find and Kill Process on Port",
                  description: "Find and kill whatever process is listening on port 3000",
                  contentType: "text",
                  language: "bash",
                  content: "lsof -ti:3000 | xargs kill -9",
                },
              },
            },
            {
              item: {
                create: {
                  userId: user.id,
                  typeId: typeIdByName.command,
                  title: "Clean npm Cache",
                  description: "Clear the local npm cache when installs behave strangely",
                  contentType: "text",
                  language: "bash",
                  content: "npm cache clean --force",
                },
              },
            },
          ],
        },
      },
    });

    const itemCount = await prisma.item.count({ where: { userId: user.id } });
    console.log(
      `Seeded 1 user, ${itemTypes.length} item types, 3 collections (${[
        reactPatterns,
        devOps,
        terminalCommands,
      ]
        .map((c) => c.name)
        .join(", ")}), ${itemCount} items.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
});
