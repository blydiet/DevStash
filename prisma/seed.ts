import { config } from "dotenv";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.js";

// Load env vars ourselves — this script runs standalone, outside Next.js's automatic loading.
config();
config({ path: ".env.local", override: true });

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
        items: {
          create: [
            {
              userId: user.id,
              typeId: typeIdByName.snippet,
              title: "useDebounce Hook",
              description: "Custom hook to debounce a rapidly changing value",
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
            {
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
            {
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
          ],
        },
      },
    });

    const aiWorkflows = await prisma.collection.create({
      data: {
        userId: user.id,
        name: "AI Workflows",
        description: "AI prompts and workflow automations",
        items: {
          create: [
            {
              userId: user.id,
              typeId: typeIdByName.prompt,
              title: "Code Review Prompt",
              description: "Prompt template for requesting a thorough code review",
              contentType: "text",
              content:
                "Review the following code for correctness, readability, and potential edge cases. Point out any bugs, suggest simplifications, and flag anything that deviates from the existing patterns in the codebase. Be specific about file and line references.\n\n```\n{code}\n```",
            },
            {
              userId: user.id,
              typeId: typeIdByName.prompt,
              title: "Documentation Generator Prompt",
              description: "Prompt template for generating docs from source code",
              contentType: "text",
              content:
                "Generate concise documentation for the following function or module. Include a one-sentence summary, parameter descriptions, return value, and one usage example. Avoid restating what the code obviously does.\n\n```\n{code}\n```",
            },
            {
              userId: user.id,
              typeId: typeIdByName.prompt,
              title: "Refactoring Assistant Prompt",
              description: "Prompt template for guided refactoring suggestions",
              contentType: "text",
              content:
                "Suggest a refactor for the following code that improves readability and removes duplication, without changing its external behavior. Explain the reasoning behind each change before showing the revised code.\n\n```\n{code}\n```",
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
            {
              userId: user.id,
              typeId: typeIdByName.command,
              title: "Deploy to Production",
              description: "Build and deploy the current branch straight to production",
              contentType: "text",
              language: "bash",
              content: "npm run build && vercel --prod --yes",
            },
            {
              userId: user.id,
              typeId: typeIdByName.link,
              title: "Docker Documentation",
              description: "Official Docker documentation",
              contentType: "text",
              url: "https://docs.docker.com/",
            },
            {
              userId: user.id,
              typeId: typeIdByName.link,
              title: "GitHub Actions Documentation",
              description: "Official GitHub Actions documentation for CI/CD workflows",
              contentType: "text",
              url: "https://docs.github.com/en/actions",
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
        items: {
          create: [
            {
              userId: user.id,
              typeId: typeIdByName.command,
              title: "Undo Last Commit (Keep Changes)",
              description: "Undo the last commit but keep the changes staged",
              contentType: "text",
              language: "bash",
              content: "git reset --soft HEAD~1",
            },
            {
              userId: user.id,
              typeId: typeIdByName.command,
              title: "Remove All Stopped Containers",
              description: "Clean up stopped Docker containers",
              contentType: "text",
              language: "bash",
              content: "docker container prune -f",
            },
            {
              userId: user.id,
              typeId: typeIdByName.command,
              title: "Find and Kill Process on Port",
              description: "Find and kill whatever process is listening on port 3000",
              contentType: "text",
              language: "bash",
              content: "lsof -ti:3000 | xargs kill -9",
            },
            {
              userId: user.id,
              typeId: typeIdByName.command,
              title: "Clean npm Cache",
              description: "Clear the local npm cache when installs behave strangely",
              contentType: "text",
              language: "bash",
              content: "npm cache clean --force",
            },
          ],
        },
      },
    });

    const designResources = await prisma.collection.create({
      data: {
        userId: user.id,
        name: "Design Resources",
        description: "UI/UX resources and references",
        items: {
          create: [
            {
              userId: user.id,
              typeId: typeIdByName.link,
              title: "Tailwind CSS Docs",
              description: "Official Tailwind CSS documentation and utility reference",
              contentType: "text",
              url: "https://tailwindcss.com/docs",
            },
            {
              userId: user.id,
              typeId: typeIdByName.link,
              title: "shadcn/ui",
              description: "Copy-paste component library built on Radix UI and Tailwind",
              contentType: "text",
              url: "https://ui.shadcn.com",
            },
            {
              userId: user.id,
              typeId: typeIdByName.link,
              title: "Material Design 3",
              description: "Google's Material Design 3 system guidelines",
              contentType: "text",
              url: "https://m3.material.io",
            },
            {
              userId: user.id,
              typeId: typeIdByName.link,
              title: "Lucide Icons",
              description: "Open-source icon library used throughout this project",
              contentType: "text",
              url: "https://lucide.dev",
            },
          ],
        },
      },
    });

    const itemCount = await prisma.item.count({ where: { userId: user.id } });
    console.log(
      `Seeded 1 user, ${itemTypes.length} item types, 5 collections (${[
        reactPatterns,
        aiWorkflows,
        devOps,
        terminalCommands,
        designResources,
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
