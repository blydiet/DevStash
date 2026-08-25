"use server";

import { auth } from "@/auth";
import {
  createItem as createItemInDb,
  deleteItem as deleteItemInDb,
  getItemTypeByName,
  updateItem as updateItemInDb,
} from "@/lib/db/items";
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

  const item = await createItemInDb({ ...parsed.data, type });

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

  const item = await updateItemInDb(itemId, parsed.data);

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

  const deleted = await deleteItemInDb(itemId);

  if (!deleted) {
    return { success: false, error: "Item not found" };
  }

  return { success: true };
}
