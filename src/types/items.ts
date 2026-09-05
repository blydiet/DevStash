import type { ItemDetail } from "@/lib/db/items-queries";

export interface CreateItemActionResult {
  success: boolean;
  data?: ItemDetail;
  error?: string;
}

export interface UpdateItemActionResult {
  success: boolean;
  data?: ItemDetail;
  error?: string;
  // Non-fatal: set when the update succeeded but one or more requested
  // collectionIds were dropped because the user doesn't own them.
  warning?: string;
}

export interface DeleteItemActionResult {
  success: boolean;
  error?: string;
}
