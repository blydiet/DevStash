import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUserId } from "@/lib/db/user";
import { getItemDetail, type ItemDetail, type ItemTypeSummary } from "@/lib/db/items-queries";
import { deleteFromR2, extractKeyFromUrl } from "@/lib/r2";
import { FREE_TIER_ITEM_LIMIT, ItemLimitExceededError } from "@/lib/subscription-limits";
import { withSerializableRetry } from "@/lib/db/with-serializable-retry";

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
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  tags: string[];
  collectionIds: string[];
}

export interface UpdateItemResult {
  item: ItemDetail;
  // Requested collectionIds that were dropped because the current user doesn't
  // own them (same IDOR-prevention filtering as getOwnedCollectionIds/createItem) —
  // surfaced so the caller can tell the update only partially applied, rather than
  // failing silently.
  droppedCollectionIds: string[];
}

export async function updateItem(id: string, data: UpdateItemInput): Promise<UpdateItemResult | null> {
  const userId = await getCurrentUserId();

  // Read-only — sources the previous file's R2 key for cleanup if this update
  // replaces it. The atomic updateMany below is the sole authorization/write decision.
  const previous = await prisma.item.findFirst({ where: { id, userId }, select: { fileUrl: true } });

  let count: number;
  try {
    ({ count } = await prisma.item.updateMany({
      where: { id, userId },
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        url: data.url,
        language: data.language,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
      },
    }));
  } catch (err) {
    console.error(`Failed to update item ${id}:`, err);
    throw err;
  }

  if (count === 0) return null;

  let droppedCollectionIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.itemTag.deleteMany({ where: { itemId: id } });

    // Dedupe: duplicate names would otherwise upsert the same tag twice and then
    // try to createMany two identical {itemId, tagId} join rows, violating
    // ItemTag's composite primary key.
    const uniqueTagNames = [...new Set(data.tags)];

    const tags = await Promise.all(
      uniqueTagNames.map((name) =>
        tx.tag.upsert({
          where: { userId_name: { userId, name } },
          update: {},
          create: { userId, name },
        })
      )
    );

    if (tags.length > 0) {
      await tx.itemTag.createMany({
        data: tags.map((tag) => ({ itemId: id, tagId: tag.id })),
      });
    }

    await tx.itemCollection.deleteMany({ where: { itemId: id } });

    const ownedCollectionIds = await getOwnedCollectionIds(tx, userId, data.collectionIds);
    droppedCollectionIds = data.collectionIds.filter((cid) => !ownedCollectionIds.includes(cid));

    if (ownedCollectionIds.length > 0) {
      await tx.itemCollection.createMany({
        data: ownedCollectionIds.map((collectionId) => ({ itemId: id, collectionId })),
      });
    }
  });

  if (previous?.fileUrl && previous.fileUrl !== data.fileUrl) {
    try {
      await deleteFromR2(extractKeyFromUrl(previous.fileUrl));
    } catch (err) {
      console.error(`Failed to delete replaced R2 object for item ${id}:`, err);
    }
  }

  let item: ItemDetail | null;
  try {
    item = await getItemDetail(id);
  } catch (err) {
    console.error(`Failed to refetch item ${id} after updating:`, err);
    throw err;
  }

  if (!item) return null;

  return { item, droppedCollectionIds };
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
  isPro: boolean;
}

export async function createItem(data: CreateItemInput): Promise<ItemDetail> {
  const userId = await getCurrentUserId();

  const created = await withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        // Counted inside the same transaction as the insert below, under
        // SERIALIZABLE isolation, so two concurrent creates can't both read
        // "under the limit" before either is persisted — Postgres aborts one
        // of two conflicting serializable transactions with a serialization
        // error, which withSerializableRetry retries.
        if (!data.isPro) {
          const itemCount = await tx.item.count({ where: { userId } });
          if (itemCount >= FREE_TIER_ITEM_LIMIT) {
            throw new ItemLimitExceededError();
          }
        }

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
      },
      { isolationLevel: "Serializable" }
    )
  );

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

export async function setItemFavorite(id: string, isFavorite: boolean): Promise<ItemDetail | null> {
  const userId = await getCurrentUserId();

  let count: number;
  try {
    ({ count } = await prisma.item.updateMany({ where: { id, userId }, data: { isFavorite } }));
  } catch (err) {
    console.error(`Failed to update favorite for item ${id}:`, err);
    throw err;
  }

  if (count === 0) return null;

  try {
    return await getItemDetail(id);
  } catch (err) {
    console.error(`Failed to refetch item ${id} after favoriting:`, err);
    throw err;
  }
}

export async function setItemPinned(id: string, isPinned: boolean): Promise<ItemDetail | null> {
  const userId = await getCurrentUserId();

  let count: number;
  try {
    ({ count } = await prisma.item.updateMany({ where: { id, userId }, data: { isPinned } }));
  } catch (err) {
    console.error(`Failed to update pin for item ${id}:`, err);
    throw err;
  }

  if (count === 0) return null;

  try {
    return await getItemDetail(id);
  } catch (err) {
    console.error(`Failed to refetch item ${id} after pinning:`, err);
    throw err;
  }
}

// A narrow, content-only sibling to updateItem — used by the Optimize-prompt
// apply flow, which only ever changes `content` and must not touch
// title/tags/collectionIds at all. Reusing updateItem there would mean
// reconstructing those unrelated fields from a client-side snapshot that
// could be stale relative to a concurrent edit (e.g. a second tab), silently
// overwriting it; this function can't do that because it never reads or
// writes those fields in the first place, mirroring setItemFavorite/
// setItemPinned's single-field shape exactly.
export async function setItemContent(id: string, content: string): Promise<ItemDetail | null> {
  const userId = await getCurrentUserId();

  let count: number;
  try {
    ({ count } = await prisma.item.updateMany({ where: { id, userId }, data: { content } }));
  } catch (err) {
    console.error(`Failed to update content for item ${id}:`, err);
    throw err;
  }

  if (count === 0) return null;

  try {
    return await getItemDetail(id);
  } catch (err) {
    console.error(`Failed to refetch item ${id} after updating content:`, err);
    throw err;
  }
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
