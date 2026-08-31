import { Fragment, type ReactNode } from "react";
import { getItemsByCollection, type ItemSummary } from "@/lib/db/items-queries";
import { FileListItem } from "./FileListItem";
import { ImageCard } from "./ImageCard";
import { ItemCard } from "./ItemCard";

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

export async function CollectionItemsGrid({ collectionId }: { collectionId: string }) {
  let items: ItemSummary[] = [];
  let error: string | null = null;

  try {
    items = await getItemsByCollection(collectionId);
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
    </div>
  );
}
