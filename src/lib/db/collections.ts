import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/user";
import { clampPage, COLLECTIONS_PER_PAGE, DASHBOARD_COLLECTIONS_LIMIT, getTotalPages } from "@/lib/pagination";
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

export interface CollectionOption {
  id: string;
  name: string;
}

export const getAllCollections = cache(async (): Promise<CollectionOption[]> => {
  const userId = await getCurrentUserId();
  return prisma.collection.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
});

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
async function fetchCollectionSummaries(take?: number, skip?: number): Promise<CollectionSummary[]> {
  const userId = await getCurrentUserId();
  const collections = await prisma.collection.findMany({
    where: { userId },
    // id is a stable tiebreaker: two collections can share the same updatedAt
    // (e.g. both untouched since creation), and skip/take pagination needs a
    // consistent order across requests or an item can land on two pages or none.
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    ...(take !== undefined ? { take } : {}),
    ...(skip !== undefined ? { skip } : {}),
    select: {
      id: true,
      name: true,
      description: true,
      isFavorite: true,
      items: {
        select: {
          item: {
            select: {
              typeId: true,
              type: { select: { id: true, name: true, icon: true, color: true } },
            },
          },
        },
      },
    },
  });

  return collections.map((collection) => {
    const typeUsage = new Map<string, { type: CollectionType; count: number }>();
    for (const { item } of collection.items) {
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

export const getRecentCollections = cache(
  async (limit = DASHBOARD_COLLECTIONS_LIMIT): Promise<CollectionSummary[]> =>
    fetchCollectionSummaries(limit),
);

export interface CollectionsPage {
  collections: CollectionSummary[];
  totalCount: number;
  currentPage: number;
}

export async function getCollectionsPage(requestedPage = 1): Promise<CollectionsPage> {
  const userId = await getCurrentUserId();
  const totalCount = await prisma.collection.count({ where: { userId } });
  const currentPage = clampPage(requestedPage, getTotalPages(totalCount, COLLECTIONS_PER_PAGE));

  const collections = await fetchCollectionSummaries(
    COLLECTIONS_PER_PAGE,
    (currentPage - 1) * COLLECTIONS_PER_PAGE,
  );

  return { collections, totalCount, currentPage };
}

export const getAllCollectionSummaries = cache(
  async (): Promise<CollectionSummary[]> => fetchCollectionSummaries(),
);

export interface FavoriteCollection {
  id: string;
  name: string;
  createdAt: Date;
}

export async function getFavoriteCollections(): Promise<FavoriteCollection[]> {
  const userId = await getCurrentUserId();
  const collections = await prisma.collection.findMany({
    where: { userId, isFavorite: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, createdAt: true },
  });

  return collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    createdAt: collection.createdAt,
  }));
}

export interface CollectionDetail {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
}

export const getCollectionById = cache(
  async (id: string): Promise<CollectionDetail | null> => {
    const userId = await getCurrentUserId();
    return prisma.collection.findFirst({
      where: { id, userId },
      select: { id: true, name: true, description: true, isFavorite: true },
    });
  },
);

export interface UpdateCollectionInput {
  name: string;
  description: string | null;
}

export async function updateCollection(
  id: string,
  data: UpdateCollectionInput,
): Promise<CollectionDetail | null> {
  const userId = await getCurrentUserId();

  const { count } = await prisma.collection.updateMany({
    where: { id, userId },
    data: { name: data.name, description: data.description },
  });

  if (count === 0) return null;

  return prisma.collection.findFirst({
    where: { id, userId },
    select: { id: true, name: true, description: true, isFavorite: true },
  });
}

export async function deleteCollection(id: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  const { count } = await prisma.collection.deleteMany({ where: { id, userId } });
  return count > 0;
}
