import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/user";
import {cache} from "react";


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

export interface CreateCollectionInput {
  name: string;
  description: string | null;
}

export async function createCollection(data: CreateCollectionInput): Promise<CollectionSummary> {
  const userId = await getCurrentUserId();

  const collection = await prisma.collection.create({
    data: { name: data.name, description: data.description, userId },
  });

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isFavorite: collection.isFavorite,
    itemCount: 0,
    borderColor: FALLBACK_BORDER_COLOR,
    types: [],
  };
}

export async function getCollectionStats(): Promise<CollectionStats> {
  const userId = await getCurrentUserId();
  const [total, favorites] = await Promise.all([
    prisma.collection.count({ where: { userId } }),
    prisma.collection.count({ where: { userId, isFavorite: true } }),
  ]);

  return { total, favorites };
}
export const getRecentCollections = cache(
 async (limit = 6): Promise<CollectionSummary[]> => {
  const userId = await getCurrentUserId();
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      isFavorite: true,
      items: {
        select: {
          typeId: true,
          type: { select: { id: true, name: true, icon: true, color: true } },
        },
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
});
