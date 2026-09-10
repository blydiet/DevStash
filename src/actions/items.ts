"use server";

import { auth } from "@/auth";
import {
  createItem as createItemInDb,
  deleteItem as deleteItemInDb,
  setItemContent as setItemContentInDb,
  setItemFavorite as setItemFavoriteInDb,
  setItemPinned as setItemPinnedInDb,
  updateItem as updateItemInDb,
} from "@/lib/db/items-mutations";
import { getItemTypeByName } from "@/lib/db/item-metadata";
import { createItemSchema, updateItemSchema } from "@/lib/validations/items";
import { isProOnlyItemType, ItemLimitExceededError } from "@/lib/subscription-limits";
import type { CreateItemActionResult, DeleteItemActionResult, UpdateItemActionResult } from "@/types/items";

export async function createItem(data: {
  type: string;
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
}): Promise<CreateItemActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = createItemSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  if (isProOnlyItemType(parsed.data.type) && !session.user.isPro) {
    return { success: false, error: "Upgrade to Pro to create file and image items." };
  }

  const type = await getItemTypeByName(parsed.data.type);

  if (!type) {
    return { success: false, error: "Invalid item type" };
  }

  let item;
  try {
    item = await createItemInDb({ ...parsed.data, type, isPro: session.user.isPro });
  } catch (err) {
    if (err instanceof ItemLimitExceededError) {
      return {
        success: false,
        error: "Free plan is limited to 50 items. Upgrade to Pro for unlimited items.",
      };
    }
    console.error("Failed to create item:", err);
    return { success: false, error: "Failed to create item" };
  }

  return { success: true, data: item };
}

export async function updateItem(
  itemId: string,
  data: {
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
): Promise<UpdateItemActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = updateItemSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  let result;
  try {
    result = await updateItemInDb(itemId, parsed.data);
  } catch (err) {
    console.error("Failed to update item:", err);
    return { success: false, error: "Failed to update item" };
  }

  if (!result) {
    return { success: false, error: "Item not found" };
  }

  const dropped = result.droppedCollectionIds.length;

  return {
    success: true,
    data: result.item,
    ...(dropped > 0 && {
      warning: `${dropped} collection${dropped === 1 ? "" : "s"} could not be applied`,
    }),
  };
}

export async function toggleItemFavorite(
  itemId: string,
  isFavorite: boolean
): Promise<UpdateItemActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  let item;
  try {
    item = await setItemFavoriteInDb(itemId, isFavorite);
  } catch (err) {
    console.error("Failed to update item favorite:", err);
    return { success: false, error: "Failed to update favorite" };
  }

  if (!item) {
    return { success: false, error: "Item not found" };
  }

  return { success: true, data: item };
}

// Narrow, content-only counterpart to updateItem — see setItemContent's own
// comment for why: it exists specifically so the Optimize-prompt apply flow
// never has to reconstruct title/tags/collectionIds from a snapshot that
// could be stale relative to a concurrent edit.
export async function updateItemContent(itemId: string, content: string): Promise<UpdateItemActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  let item;
  try {
    item = await setItemContentInDb(itemId, content);
  } catch (err) {
    console.error(`Failed to update content for item ${itemId}:`, err);
    return { success: false, error: "Failed to update item" };
  }

  if (!item) {
    return { success: false, error: "Item not found" };
  }

  return { success: true, data: item };
}

export async function toggleItemPin(itemId: string, isPinned: boolean): Promise<UpdateItemActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  let item;
  try {
    item = await setItemPinnedInDb(itemId, isPinned);
  } catch (err) {
    console.error(`Failed to update item pin for item ${itemId}:`, err);
    return { success: false, error: "Failed to update pin" };
  }

  if (!item) {
    return { success: false, error: "Item not found" };
  }

  return { success: true, data: item };
}

export async function deleteItem(itemId: string): Promise<DeleteItemActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  let deleted;
  try {
    deleted = await deleteItemInDb(itemId);
  } catch (err) {
    console.error("Failed to delete item:", err);
    return { success: false, error: "Failed to delete item" };
  }

  if (!deleted) {
    return { success: false, error: "Item not found" };
  }

  return { success: true };
}
