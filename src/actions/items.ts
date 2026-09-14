"use server";

import type { z } from "zod";
import { requireSession } from "@/lib/auth-guard";
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

// Shared by toggleItemFavorite/updateItemContent/toggleItemPin below — all
// three are the same try/catch → not-found → success shape around a
// single-field db/items-mutations.ts call, differing only in which db
// function is called and the two message strings. deleteItem has the same
// skeleton but returns a boolean instead of an entity and has no `data`
// field, so it isn't forced into this generic — kept separate below.
async function mutateOwnedItem<T>(
  itemId: string,
  mutate: () => Promise<T | null>,
  actionLabel: string,
  failureMessage: string
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  let result: T | null;
  try {
    result = await mutate();
  } catch (err) {
    console.error(`Failed to ${actionLabel} for item ${itemId}:`, err);
    return { success: false, error: failureMessage };
  }

  if (!result) {
    return { success: false, error: "Item not found" };
  }

  return { success: true, data: result };
}

// z.infer (the schema's *output* type) rather than z.input: fileUrl/fileName/
// fileSize carry .default(null), so the input type would make them optional —
// looser than this action's actual contract, where every field is always
// passed explicitly (see CreateItemDialog.tsx). Output keeps them required,
// matching the field list Zod already owns without loosening the signature.
export async function createItem(
  data: z.infer<typeof createItemSchema>
): Promise<CreateItemActionResult> {
  const authed = await requireSession();
  if (!authed.ok) return authed.result;

  const parsed = createItemSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  if (isProOnlyItemType(parsed.data.type) && !authed.user.isPro) {
    return { success: false, error: "Upgrade to Pro to create file and image items." };
  }

  const type = await getItemTypeByName(parsed.data.type);

  if (!type) {
    return { success: false, error: "Invalid item type" };
  }

  let item;
  try {
    item = await createItemInDb({ ...parsed.data, type, isPro: authed.user.isPro });
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

// See createItem's comment above on z.infer vs z.input.
export async function updateItem(
  itemId: string,
  data: z.infer<typeof updateItemSchema>
): Promise<UpdateItemActionResult> {
  const authed = await requireSession();
  if (!authed.ok) return authed.result;

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
  const authed = await requireSession();
  if (!authed.ok) return authed.result;

  return mutateOwnedItem(
    itemId,
    () => setItemFavoriteInDb(itemId, isFavorite),
    "update favorite",
    "Failed to update favorite"
  );
}

// Narrow, content-only counterpart to updateItem — see setItemContent's own
// comment for why: it exists specifically so the Optimize-prompt apply flow
// never has to reconstruct title/tags/collectionIds from a snapshot that
// could be stale relative to a concurrent edit.
export async function updateItemContent(itemId: string, content: string): Promise<UpdateItemActionResult> {
  const authed = await requireSession();
  if (!authed.ok) return authed.result;

  return mutateOwnedItem(
    itemId,
    () => setItemContentInDb(itemId, content),
    "update content",
    "Failed to update item"
  );
}

export async function toggleItemPin(itemId: string, isPinned: boolean): Promise<UpdateItemActionResult> {
  const authed = await requireSession();
  if (!authed.ok) return authed.result;

  return mutateOwnedItem(
    itemId,
    () => setItemPinnedInDb(itemId, isPinned),
    "update pin",
    "Failed to update pin"
  );
}

export async function deleteItem(itemId: string): Promise<DeleteItemActionResult> {
  const authed = await requireSession();
  if (!authed.ok) return authed.result;

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
