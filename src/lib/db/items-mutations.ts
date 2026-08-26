import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/user";
import { getItemDetail, type ItemDetail, type ItemTypeSummary } from "@/lib/db/items-queries";
import { deleteFromR2, extractKeyFromUrl } from "@/lib/r2";

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

  try {
    if (count > 0 && existing?.fileUrl) {
      await deleteFromR2(extractKeyFromUrl(existing.fileUrl));
    }
  } catch (err) {
    console.error(`Failed to delete R2 object for item ${id}:`, err);
  }

  return count > 0;
}
