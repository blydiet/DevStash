import { getItemsByType, type ItemSummary } from "@/lib/db/items-queries";
import { FileListItem } from "./FileListItem";
import { ImageCard } from "./ImageCard";
import { ItemCard } from "./ItemCard";

export async function ItemsGrid({ typeName }: { typeName: string }) {
  let items: ItemSummary[] = [];
  let error: string | null = null;

  try {
    items = await getItemsByType(typeName);


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

  if (isFileList) {
    return (
      <div className="rounded-lg border">
        {items.map((item) => (
          <FileListItem key={item.id} item={item} />
        ))}
      </div>
    );
  }

  return (
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
  );
}
