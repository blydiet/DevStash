import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSearchableItems, type SearchableItem } from "@/lib/db/items-queries";
import { getAllCollectionSummaries, type CollectionSummary } from "@/lib/db/collections";
import type { GlobalSearchData } from "@/types/search";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const [itemsResult, collectionsResult] = await Promise.allSettled([
    getSearchableItems(),
    getAllCollectionSummaries(),
  ]);

  const itemsError = itemsResult.status === "rejected";
  if (itemsError) {
    console.error("Failed to load searchable items for global search", itemsResult.reason);
  }
  const items: SearchableItem[] =
    itemsResult.status === "fulfilled" ? itemsResult.value.items : [];
  const itemsTruncated = itemsResult.status === "fulfilled" ? itemsResult.value.truncated : false;

  const collectionsError = collectionsResult.status === "rejected";
  if (collectionsError) {
    console.error("Failed to load collections for global search", collectionsResult.reason);
  }
  const collections: CollectionSummary[] =
    collectionsResult.status === "fulfilled" ? collectionsResult.value : [];

  const data: GlobalSearchData = {
    items,
    itemsTruncated,
    itemsError,
    collections,
    collectionsError,
  };

  return NextResponse.json({ success: true, data });
}
