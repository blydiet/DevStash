import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/user";
import {
  clampPage,
  DASHBOARD_RECENT_ITEMS_LIMIT,
  getTotalPages,
  ITEMS_PER_PAGE,
} from "@/lib/pagination";

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

export async function getRecentItems(limit = DASHBOARD_RECENT_ITEMS_LIMIT): Promise<ItemSummary[]> {
  const userId = await getCurrentUserId();
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { type: true, tags: { include: { tag: true } } },
  });

  return items.map(toItemSummary);
}

export interface FavoriteItem {
  id: string;
  title: string;
  createdAt: Date;
  type: ItemTypeSummary;
}

export async function getFavoriteItems(): Promise<FavoriteItem[]> {
  const userId = await getCurrentUserId();
  const items = await prisma.item.findMany({
    where: { userId, isFavorite: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      type: { select: { id: true, name: true, icon: true, color: true } },
    },
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    createdAt: item.createdAt,
    type: item.type,
  }));
}

export interface PaginatedItems {
  items: ItemSummary[];
  totalCount: number;
  currentPage: number;
}

// createdAt alone isn't a stable sort key: items created in the same millisecond
// (bulk import, fast successive creates) have undefined relative order across
// separate skip/take requests, letting an item land on two pages or on neither.
// id is a stable tiebreaker.
const PAGINATED_ITEM_ORDER = [{ createdAt: "desc" as const }, { id: "desc" as const }];

export async function getItemsByType(typeName: string, requestedPage = 1): Promise<PaginatedItems> {
  const userId = await getCurrentUserId();
  const where = { userId, type: { name: typeName } };

  const totalCount = await prisma.item.count({ where });
  const currentPage = clampPage(requestedPage, getTotalPages(totalCount, ITEMS_PER_PAGE));

  const items = await prisma.item.findMany({
    where,
    orderBy: PAGINATED_ITEM_ORDER,
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
    include: { type: true, tags: { include: { tag: true } } },
  });

  return { items: items.map(toItemSummary), totalCount, currentPage };
}

export async function getItemsByCollection(
  collectionId: string,
  requestedPage = 1,
): Promise<PaginatedItems> {
  const userId = await getCurrentUserId();
  const where = { userId, collections: { some: { collectionId, collection: { userId } } } };

  const totalCount = await prisma.item.count({ where });
  const currentPage = clampPage(requestedPage, getTotalPages(totalCount, ITEMS_PER_PAGE));

  const items = await prisma.item.findMany({
    where,
    orderBy: PAGINATED_ITEM_ORDER,
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
    include: { type: true, tags: { include: { tag: true } } },
  });

  return { items: items.map(toItemSummary), totalCount, currentPage };
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
