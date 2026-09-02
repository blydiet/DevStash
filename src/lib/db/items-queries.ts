import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/user";

export interface ItemTypeSummary {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface ItemSummary {
  id: string;
  title: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: Date;
  type: ItemTypeSummary;
  tags: string[];
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
}

export interface CollectionRef {
  id: string;
  name: string;
}

export interface ItemDetail {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  url: string | null;
  language: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  type: ItemTypeSummary;
  tags: string[];
  collections: CollectionRef[];
}

type PrismaItemWithRelations = {
  id: string;
  title: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: Date;
  type: ItemTypeSummary;
  tags: { tag: { name: string } }[];
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
};

function toItemSummary(item: PrismaItemWithRelations): ItemSummary {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    createdAt: item.createdAt,
    type: item.type,
    tags: item.tags.map(({ tag }) => tag.name),
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    fileSize: item.fileSize,
  };
}

export async function getPinnedItems(): Promise<ItemSummary[]> {
  const userId = await getCurrentUserId();
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: { updatedAt: "desc" },
    include: { type: true, tags: { include: { tag: true } } },
  });

  return items.map(toItemSummary);
}

export async function getRecentItems(limit = 10): Promise<ItemSummary[]> {
  const userId = await getCurrentUserId();
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { type: true, tags: { include: { tag: true } } },
  });

  return items.map(toItemSummary);
}

export async function getItemsByType(typeName: string): Promise<ItemSummary[]> {
  const userId = await getCurrentUserId();
  const items = await prisma.item.findMany({
    where: { userId, type: { name: typeName } },
    orderBy: { createdAt: "desc" },
    include: { type: true, tags: { include: { tag: true } } },
  });

  return items.map(toItemSummary);
}

export async function getItemsByCollection(collectionId: string): Promise<ItemSummary[]> {
  const userId = await getCurrentUserId();
  const items = await prisma.item.findMany({
    where: { userId, collections: { some: { collectionId, collection: { userId } } } },
    orderBy: { createdAt: "desc" },
    include: { type: true, tags: { include: { tag: true } } },
  });

  return items.map(toItemSummary);
}

export interface SearchableItem {
  id: string;
  title: string;
  type: ItemTypeSummary;
  contentPreview: string | null;
}

const CONTENT_PREVIEW_LENGTH = 140;
// Safety cap for the client-side search index — well above the free-tier 50-item
// limit, but bounded so a high-volume Pro account can't force an unbounded fetch.
const MAX_SEARCHABLE_ITEMS = 500;

function toContentPreview(...candidates: (string | null)[]): string | null {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed.length > CONTENT_PREVIEW_LENGTH
        ? `${trimmed.slice(0, CONTENT_PREVIEW_LENGTH)}…`
        : trimmed;
    }
  }
  return null;
}

export interface SearchableItemsResult {
  items: SearchableItem[];
  truncated: boolean;
}

export async function getSearchableItems(): Promise<SearchableItemsResult> {
  const userId = await getCurrentUserId();
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: MAX_SEARCHABLE_ITEMS + 1,
    select: {
      id: true,
      title: true,
      content: true,
      description: true,
      url: true,
      type: { select: { id: true, name: true, icon: true, color: true } },
    },
  });

  const truncated = items.length > MAX_SEARCHABLE_ITEMS;

  return {
    items: items.slice(0, MAX_SEARCHABLE_ITEMS).map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      contentPreview: toContentPreview(item.content, item.description, item.url),
    })),
    truncated,
  };
}

export async function getItemDetail(id: string): Promise<ItemDetail | null> {
  const userId = await getCurrentUserId();
  const item = await prisma.item.findFirst({
    where: { id, userId },
    select: {
      id: true,
      title: true,
      description: true,
      contentType: true,
      content: true,
      fileUrl: true,
      fileName: true,
      fileSize: true,
      url: true,
      language: true,
      isFavorite: true,
      isPinned: true,
      createdAt: true,
      updatedAt: true,
      type: { select: { id: true, name: true, icon: true, color: true } },
      tags: { select: { tag: { select: { name: true } } } },
      collections: { select: { collection: { select: { id: true, name: true } } } },
    },
  });

  if (!item) return null;

  return {
    ...item,
    tags: item.tags.map(({ tag }) => tag.name),
    collections: item.collections.map(({ collection }) => collection),
  };
}
