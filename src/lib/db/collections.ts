import { prisma } from "@/lib/prisma";

const DEMO_EMAIL = "demo@devstash.io";

const FALLBACK_BORDER_COLOR = "#94a3b8";

export interface CollectionType {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  borderColor: string;
  types: CollectionType[];
}

export interface CollectionStats {
  total: number;
  favorites: number;
}

export async function getCollectionStats(): Promise<CollectionStats> {
  const [total, favorites] = await Promise.all([
    prisma.collection.count({ where: { user: { email: DEMO_EMAIL } } }),
    prisma.collection.count({ where: { user: { email: DEMO_EMAIL }, isFavorite: true } }),
  ]);

  return { total, favorites };
}

export async function getRecentCollections(limit = 6): Promise<CollectionSummary[]> {
  const collections = await prisma.collection.findMany({
    where: { user: { email: DEMO_EMAIL } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      items: {
        include: { type: true },
      },
    },
  });

  return collections.map((collection) => {
    const typeUsage = new Map<string, { type: CollectionType; count: number }>();
    for (const item of collection.items) {
      const existing = typeUsage.get(item.typeId);
      if (existing) {
        existing.count += 1;
      } else {
        typeUsage.set(item.typeId, { type: item.type, count: 1 });
      }
    }

    const usageByCount = [...typeUsage.values()].sort((a, b) => b.count - a.count);

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      isFavorite: collection.isFavorite,
      itemCount: collection.items.length,
      borderColor: usageByCount[0]?.type.color ?? FALLBACK_BORDER_COLOR,
      types: usageByCount.map((usage) => usage.type),
    };
  });
}
