import type { ItemDetail } from "@/lib/db/items";

export interface CreateItemActionResult {
  success: boolean;
  data?: ItemDetail;
  error?: string;
}

export interface UpdateItemActionResult {
  success: boolean;
  data?: ItemDetail;
  error?: string;
}

export interface DeleteItemActionResult {
  success: boolean;
  error?: string;
}
