import { Pin } from "lucide-react";
import { getPinnedItems, type ItemSummary } from "@/lib/db/items";
import { ItemRow } from "./ItemRow";

export async function PinnedItems() {
  let pinnedItems: ItemSummary[] = [];
  let error: string | null = null;

  try {
    pinnedItems = await getPinnedItems();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load pinned items";
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load pinned items: {error}</p>;
  }

  if (pinnedItems.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 pb-4">
        <Pin className="size-4 text-muted-foreground" />
        <h2 className="text-xl font-bold">Pinned</h2>
      </div>
      <div className="flex flex-col gap-3">
        {pinnedItems.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
