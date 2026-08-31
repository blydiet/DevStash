import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SidebarContainer } from "@/components/dashboard/SidebarContainer";
import { getAllCollectionSummaries, type CollectionSummary } from "@/lib/db/collections";

export default async function CollectionsPage() {
  let collections: CollectionSummary[] = [];
  let error: string | null = null;

  try {
    collections = await getAllCollectionSummaries();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load collections";
  }

  return (
    <DashboardShell sidebar={<SidebarContainer />}>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold">Collections</h1>
          <p className="text-muted-foreground">All your collections</p>
        </div>

        {error && (
          <p className="text-sm text-destructive">Failed to load collections: {error}</p>
        )}

        {!error && collections.length === 0 && (
          <p className="text-sm text-muted-foreground">No collections yet</p>
        )}

        {!error && collections.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
