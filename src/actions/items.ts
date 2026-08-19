"use server";

import { auth } from "@/auth";
import { deleteItem as deleteItemInDb, updateItem as updateItemInDb } from "@/lib/db/items";
import { updateItemSchema } from "@/lib/validations/items";
import type { DeleteItemActionResult, UpdateItemActionResult } from "@/types/items";

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
