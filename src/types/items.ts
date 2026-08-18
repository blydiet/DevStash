import type { ItemDetail } from "@/lib/db/items";

export interface UpdateItemActionResult {
  success: boolean;
  data?: ItemDetail;
  error?: string;
}
