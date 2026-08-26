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
  collection: { id: string; name: string } | null;
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
      collection: { select: { id: true, name: true } },
    },
  });

  if (!item) return null;

  return { ...item, tags: item.tags.map(({ tag }) => tag.name) };
}
