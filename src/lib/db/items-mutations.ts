import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUserId } from "@/lib/db/user";
import { getItemDetail, type ItemDetail, type ItemTypeSummary } from "@/lib/db/items-queries";
import { deleteFromR2, extractKeyFromUrl } from "@/lib/r2";

// Filters to only the collection ids the user actually owns, so a client can't
// splice an item into another user's collection by passing an arbitrary id.
async function getOwnedCollectionIds(
  tx: Prisma.TransactionClient,
  userId: string,
  collectionIds: string[]
): Promise<string[]> {
  if (collectionIds.length === 0) return [];

  const owned = await tx.collection.findMany({
    where: { id: { in: collectionIds }, userId },
    select: { id: true },
  });

  return owned.map((collection) => collection.id);
}

export interface UpdateItemInput {
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  tags: string[];
  collectionIds: string[];
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

    await tx.itemCollection.deleteMany({ where: { itemId: id } });

    const ownedCollectionIds = await getOwnedCollectionIds(tx, userId, data.collectionIds);

    if (ownedCollectionIds.length > 0) {
      await tx.itemCollection.createMany({
        data: ownedCollectionIds.map((collectionId) => ({ itemId: id, collectionId })),
      });
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
  collectionIds: string[];
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

    const ownedCollectionIds = await getOwnedCollectionIds(tx, userId, data.collectionIds);

    if (ownedCollectionIds.length === 0) {
      return { item, collections: [] };
    }

    await tx.itemCollection.createMany({
      data: ownedCollectionIds.map((collectionId) => ({ itemId: item.id, collectionId })),
    });

    const collections = await tx.collection.findMany({
      where: { id: { in: ownedCollectionIds } },
      select: { id: true, name: true },
    });

    return { item, collections };
  });

  return {
    id: created.item.id,
    title: created.item.title,
    description: created.item.description,
    contentType: created.item.contentType,
    content: created.item.content,
    fileUrl: created.item.fileUrl,
    fileName: created.item.fileName,
    fileSize: created.item.fileSize,
    url: created.item.url,
    language: created.item.language,
    isFavorite: created.item.isFavorite,
    isPinned: created.item.isPinned,
    createdAt: created.item.createdAt,
    updatedAt: created.item.updatedAt,
    type: data.type,
    tags: data.tags,
    collections: created.collections,
  };
}

export async function deleteItem(id: string): Promise<boolean> {
  const userId = await getCurrentUserId();

  const existing = await prisma.item.findFirst({
    where: { id, userId },
    select: { fileUrl: true },
  });

  const { count } = await prisma.item.deleteMany({ where: { id, userId } });

  try {
    if (count > 0 && existing?.fileUrl) {
      await deleteFromR2(extractKeyFromUrl(existing.fileUrl));
    }
  } catch (err) {
    console.error(`Failed to delete R2 object for item ${id}:`, err);
  }

  return count > 0;
}
