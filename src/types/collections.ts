import type { CollectionSummary, CollectionOption } from "@/lib/db/collections";

export interface CreateCollectionResponse {
  success: boolean;
  data?: CollectionSummary;
  error?: string;
}

export interface ListCollectionsResponse {
  success: boolean;
  data?: CollectionOption[];
  error?: string;
}
