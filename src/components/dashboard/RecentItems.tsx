import { getRecentItems, type ItemSummary } from "@/lib/db/items";
import { ItemRow } from "./ItemRow";

export async function RecentItems() {
  let recentItems: ItemSummary[] = [];
  let error: string | null = null;

  try {
    recentItems = await getRecentItems();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load recent items";
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load recent items: {error}</p>;
  }

  if (recentItems.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-xl font-bold">Recent Items</h2>
      </div>
      <div className="flex flex-col gap-3">
        {recentItems.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
