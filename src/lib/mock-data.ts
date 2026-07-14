export interface User {
  id: string;
  name: string;
  email: string;
  isPro: boolean;
}

export interface ItemType {
  id: string;
  name: string;
  icon: string; // lucide-react icon name
  color: string;
  itemCount: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  isFavorite: boolean;
  color: string;
  itemCount: number;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  typeId: string;
  collectionId: string | null;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string;
}

export const currentUser: User = {
  id: "user-1",
  name: "John Doe",
  email: "demo@devstash.io",
  isPro: false,
};

export const itemTypes: ItemType[] = [
  { id: "type-snippet", name: "Snippets", icon: "Code2", color: "#3b82f6", itemCount: 24 },
  { id: "type-prompt", name: "Prompts", icon: "Sparkles", color: "#a855f7", itemCount: 18 },
  { id: "type-command", name: "Commands", icon: "Terminal", color: "#f97316", itemCount: 15 },
  { id: "type-note", name: "Notes", icon: "StickyNote", color: "#eab308", itemCount: 12 },
  { id: "type-file", name: "Files", icon: "File", color: "#94a3b8", itemCount: 5 },
  { id: "type-image", name: "Images", icon: "Image", color: "#ec4899", itemCount: 3 },
  { id: "type-url", name: "Links", icon: "Link", color: "#22c55e", itemCount: 8 },
];

export const collections: Collection[] = [
  {
    id: "collection-react-patterns",
    name: "React Patterns",
    description: "Common React patterns and hooks",
    isFavorite: true,
    color: "#3b82f6",
    itemCount: 12,
  },
  {
    id: "collection-python-snippets",
    name: "Python Snippets",
    description: "Useful Python code snippets",
    isFavorite: false,
    color: "#3b82f6",
    itemCount: 8,
  },
  {
    id: "collection-context-files",
    name: "Context Files",
    description: "AI context files for projects",
    isFavorite: true,
    color: "#e2e8f0",
    itemCount: 5,
  },
  {
    id: "collection-interview-prep",
    name: "Interview Prep",
    description: "Technical interview preparation",
    isFavorite: false,
    color: "#eab308",
    itemCount: 24,
  },
  {
    id: "collection-git-commands",
    name: "Git Commands",
    description: "Frequently used git commands",
    isFavorite: true,
    color: "#f97316",
    itemCount: 15,
  },
  {
    id: "collection-ai-prompts",
    name: "AI Prompts",
    description: "Curated AI prompts for coding",
    isFavorite: false,
    color: "#a855f7",
    itemCount: 18,
  },
];

export const items: Item[] = [
  {
    id: "item-use-auth-hook",
    title: "useAuth Hook",
    description: "Custom authentication hook for React applications",
    typeId: "type-snippet",
    collectionId: "collection-react-patterns",
    tags: ["react", "auth", "hooks"],
    isFavorite: true,
    isPinned: true,
    createdAt: "2026-01-15",
  },
  {
    id: "item-api-error-handling",
    title: "API Error Handling Pattern",
    description: "Fetch wrapper with exponential backoff retry logic",
    typeId: "type-snippet",
    collectionId: "collection-react-patterns",
    tags: ["api", "error-handling"],
    isFavorite: false,
    isPinned: true,
    createdAt: "2026-01-12",
  },
  {
    id: "item-explain-code-prompt",
    title: "Explain This Code",
    description: "Prompt for getting a clear explanation of unfamiliar code",
    typeId: "type-prompt",
    collectionId: "collection-ai-prompts",
    tags: ["ai", "prompt"],
    isFavorite: false,
    isPinned: false,
    createdAt: "2026-01-10",
  },
  {
    id: "item-git-rebase-interactive",
    title: "Interactive Rebase",
    description: "Squash and reorder commits before merging",
    typeId: "type-command",
    collectionId: "collection-git-commands",
    tags: ["git", "rebase"],
    isFavorite: true,
    isPinned: false,
    createdAt: "2026-01-08",
  },
  {
    id: "item-python-list-comprehension",
    title: "List Comprehension Cheatsheet",
    description: "Common list comprehension patterns in Python",
    typeId: "type-snippet",
    collectionId: "collection-python-snippets",
    tags: ["python"],
    isFavorite: false,
    isPinned: false,
    createdAt: "2026-01-05",
  },
  {
    id: "item-system-prompt-context",
    title: "Project Context Template",
    description: "Reusable context file for onboarding an AI assistant to a codebase",
    typeId: "type-file",
    collectionId: "collection-context-files",
    tags: ["ai", "context"],
    isFavorite: true,
    isPinned: false,
    createdAt: "2026-01-03",
  },
  {
    id: "item-big-o-notes",
    title: "Big O Cheat Sheet",
    description: "Time and space complexity notes for common algorithms",
    typeId: "type-note",
    collectionId: "collection-interview-prep",
    tags: ["algorithms", "interview"],
    isFavorite: false,
    isPinned: false,
    createdAt: "2025-12-28",
  },
  {
    id: "item-vercel-docs-link",
    title: "Next.js App Router Docs",
    description: "Official documentation for the App Router",
    typeId: "type-url",
    collectionId: null,
    tags: ["nextjs", "docs"],
    isFavorite: false,
    isPinned: false,
    createdAt: "2025-12-20",
  },
];
