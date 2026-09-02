import { getSearchableItems, type SearchableItem } from "@/lib/db/items-queries";
import { getAllCollectionSummaries, type CollectionSummary } from "@/lib/db/collections";
import { GlobalSearchDialog } from "./GlobalSearchDialog";

export async function GlobalSearchContainer() {
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

  return (
    <GlobalSearchDialog
      items={items}
      itemsTruncated={itemsTruncated}
      collections={collections}
      itemsError={itemsError}
      collectionsError={collectionsError}
    />
  );
}
