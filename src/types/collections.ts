import type { CollectionSummary } from "@/lib/db/collections";

export interface CreateCollectionResponse {
  success: boolean;
  data?: CollectionSummary;
  error?: string;
}
