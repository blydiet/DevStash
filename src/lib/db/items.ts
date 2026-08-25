import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/user";
import { deleteFromR2, extractKeyFromUrl } from "@/lib/r2";

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
}

export interface ItemStats {
  total: number;
  favorites: number;
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

export interface ItemTypeWithCount extends ItemTypeSummary {
  itemCount: number;
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

export interface UpdateItemInput {
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  tags: string[];
}

export async function updateItem(id: string, data: UpdateItemInput): Promise<ItemDetail | null> {
  const userId = await getCurrentUserId();

  const existing = await prisma.item.findFirst({ where: { id, userId }, select: { id: true } });

  if (!existing) return null;

  await prisma.$transaction(async (tx) => {
    await tx.item.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        url: data.url,
        language: data.language,
      },
    });

    await tx.itemTag.deleteMany({ where: { itemId: id } });

    for (const name of data.tags) {
      const tag = await tx.tag.upsert({
        where: { userId_name: { userId, name } },
        update: {},
        create: { userId, name },
      });

      await tx.itemTag.create({ data: { itemId: id, tagId: tag.id } });
    }
  });

  return getItemDetail(id);
}

export interface CreateItemInput {
  type: ItemTypeSummary;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  tags: string[];
}

export async function createItem(data: CreateItemInput): Promise<ItemDetail> {
  const userId = await getCurrentUserId();

  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.item.create({
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        url: data.url,
        language: data.language,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        contentType: data.fileUrl ? "file" : "text",
        userId,
        typeId: data.type.id,
      },
    });

    for (const name of data.tags) {
      const tag = await tx.tag.upsert({
        where: { userId_name: { userId, name } },
        update: {},
        create: { userId, name },
      });

      await tx.itemTag.create({ data: { itemId: item.id, tagId: tag.id } });
    }

    return item;
  });

  return {
    id: created.id,
    title: created.title,
    description: created.description,
    contentType: created.contentType,
    content: created.content,
    fileUrl: created.fileUrl,
    fileName: created.fileName,
    fileSize: created.fileSize,
    url: created.url,
    language: created.language,
    isFavorite: created.isFavorite,
    isPinned: created.isPinned,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
    type: data.type,
    tags: data.tags,
    collection: null,
  };
}

export async function deleteItem(id: string): Promise<boolean> {
  const userId = await getCurrentUserId();

  const existing = await prisma.item.findFirst({
    where: { id, userId },
    select: { fileUrl: true },
  });

  const { count } = await prisma.item.deleteMany({ where: { id, userId } });

  if (count > 0 && existing?.fileUrl) {
    try {
      await deleteFromR2(extractKeyFromUrl(existing.fileUrl));
    } catch (err) {
      console.error(`Failed to delete R2 object for item ${id}:`, err);
    }
  }

  return count > 0;
}

export async function getItemTypeByName(typeName: string): Promise<ItemTypeSummary | null> {
  const type = await prisma.itemType.findFirst({
    where: { name: typeName, isSystem: true },
  });

  if (!type) return null;

  return { id: type.id, name: type.name, icon: type.icon, color: type.color };
}

export async function getItemStats(): Promise<ItemStats> {
  const userId = await getCurrentUserId();
  const [total, favorites] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
  ]);

  return { total, favorites };
}

const ITEM_TYPE_ORDER = ["snippet", "prompt", "command", "note", "file", "image", "link"];

export async function getItemTypes(): Promise<ItemTypeWithCount[]> {
  const userId = await getCurrentUserId();
  const types = await prisma.itemType.findMany({
    where: { isSystem: true },
    include: {
      _count: {
        select: { items: { where: { userId } } },
      },
    },
  });

  types.sort((a, b) => ITEM_TYPE_ORDER.indexOf(a.name) - ITEM_TYPE_ORDER.indexOf(b.name));

  return types.map((type) => ({
    id: type.id,
    name: type.name,
    icon: type.icon,
    color: type.color,
    itemCount: type._count.items,
  }));
}
