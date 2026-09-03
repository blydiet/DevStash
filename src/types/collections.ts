import type { CollectionDetail, CollectionSummary, CollectionOption } from "@/lib/db/collections";

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

export interface UpdateCollectionResponse {
  success: boolean;
  data?: CollectionDetail;
  error?: string;
}

export interface DeleteCollectionResponse {
  success: boolean;
  error?: string;
}

export interface ToggleCollectionFavoriteResponse {
  success: boolean;
  error?: string;
}
