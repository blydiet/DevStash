import type { SearchableItem } from "@/lib/db/items-queries";
import type { CollectionSummary } from "@/lib/db/collections";

export interface GlobalSearchData {
  items: SearchableItem[];
  itemsTruncated: boolean;
  itemsError: boolean;
  collections: CollectionSummary[];
  collectionsError: boolean;
}

export interface GlobalSearchResponse {
  success: boolean;
  data?: GlobalSearchData;
  error?: string;
}
