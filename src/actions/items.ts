"use server";

import { auth } from "@/auth";
import {
  createItem as createItemInDb,
  deleteItem as deleteItemInDb,
  setItemFavorite as setItemFavoriteInDb,
  updateItem as updateItemInDb,
} from "@/lib/db/items-mutations";
import { getItemTypeByName } from "@/lib/db/item-metadata";
import { createItemSchema, updateItemSchema } from "@/lib/validations/items";
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

  const type = await getItemTypeByName(parsed.data.type);

  if (!type) {
    return { success: false, error: "Invalid item type" };
  }

  let item;
  try {
    item = await createItemInDb({ ...parsed.data, type });
  } catch (err) {
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

  let item;
  try {
    item = await updateItemInDb(itemId, parsed.data);
  } catch (err) {
    console.error("Failed to update item:", err);
    return { success: false, error: "Failed to update item" };
  }

  if (!item) {
    return { success: false, error: "Item not found" };
  }

  return { success: true, data: item };
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
