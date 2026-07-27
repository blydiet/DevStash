import { getRecentCollections, type CollectionSummary } from "@/lib/db/collections";
import { CollectionCard } from "./CollectionCard";

export async function RecentCollections() {
  let collections: CollectionSummary[] = [];
  let error: string | null = null;

  try {
    collections = await getRecentCollections();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load collections";
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load collections: {error}</p>;
  }

  return (
    <section>
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-xl font-bold">Recent Collections</h2>
      </div>
      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No collections as of right now</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </section>
  );
}
