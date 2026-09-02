import { Fragment, type ReactNode } from "react";
import { getItemsByCollection, type ItemSummary } from "@/lib/db/items-queries";
import { getTotalPages, ITEMS_PER_PAGE } from "@/lib/pagination";
import { FileListItem } from "./FileListItem";
import { ImageCard } from "./ImageCard";
import { ItemCard } from "./ItemCard";
import { PaginationControls } from "./PaginationControls";

function CardSection({
  items,
  className,
  renderItem,
}: {
  items: ItemSummary[];
  className: string;
  renderItem: (item: ItemSummary) => ReactNode;
}) {
  if (items.length === 0) return null;

  return (
    <div className={className}>
      {items.map((item) => (
        <Fragment key={item.id}>{renderItem(item)}</Fragment>
      ))}
    </div>
  );
}

export async function CollectionItemsGrid({
  collectionId,
  page = 1,
}: {
  collectionId: string;
  page?: number;
}) {
  let items: ItemSummary[] = [];
  let totalCount = 0;
  let currentPage = page;
  let error: string | null = null;

  try {
    const result = await getItemsByCollection(collectionId, page);
    items = result.items;
    totalCount = result.totalCount;
    currentPage = result.currentPage;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load items";
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load items: {error}</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No items in this collection yet</p>;
  }

  const imageItems = items.filter((item) => item.type.name === "image");
  const fileItems = items.filter((item) => item.type.name === "file");
  const otherItems = items.filter(
    (item) => item.type.name !== "image" && item.type.name !== "file",
  );
  const totalPages = getTotalPages(totalCount, ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col gap-8">
      <CardSection
        items={otherItems}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
        renderItem={(item) => <ItemCard item={item} />}
      />

      <CardSection
        items={imageItems}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        renderItem={(item) => <ImageCard item={item} />}
      />

      {fileItems.length > 0 && (
        <div className="rounded-lg border">
          {fileItems.map((item) => (
            <FileListItem key={item.id} item={item} />
          ))}
        </div>
      )}

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={`/collections/${collectionId}`}
      />
    </div>
  );
}
