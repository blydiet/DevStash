import { getItemsByType, type ItemSummary } from "@/lib/db/items-queries";
import { getTotalPages, ITEMS_PER_PAGE } from "@/lib/pagination";
import { FileListItem } from "./FileListItem";
import { ImageCard } from "./ImageCard";
import { ItemCard } from "./ItemCard";
import { PaginationControls } from "./PaginationControls";

export async function ItemsGrid({ typeName, page = 1 }: { typeName: string; page?: number }) {
  let items: ItemSummary[] = [];
  let totalCount = 0;
  let currentPage = page;
  let error: string | null = null;

  try {
    const result = await getItemsByType(typeName, page);
    items = result.items;
    totalCount = result.totalCount;
    currentPage = result.currentPage;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load items";
  }

  // Handle the case where there are no items
  // This needs to be checked outside of the try and catch block due to linitng rules

  if (error) {
    return <p className="text-sm text-destructive">Failed to load items: {error}</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No items yet</p>;
  }

  const isImageGallery = typeName === "image";
  const isFileList = typeName === "file";
  const totalPages = getTotalPages(totalCount, ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col gap-6">
      {isFileList ? (
        <div className="rounded-lg border">
          {items.map((item) => (
            <FileListItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div
          className={
            isImageGallery
              ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              : "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
          }
        >
          {items.map((item) =>
            isImageGallery ? (
              <ImageCard key={item.id} item={item} />
            ) : (
              <ItemCard key={item.id} item={item} />
            )
          )}
        </div>
      )}

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={`/items/${typeName}`}
      />
    </div>
  );
}
