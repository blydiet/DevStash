import { CollectionItemsGrid } from "@/components/dashboard/CollectionItemsGrid";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SidebarContainer } from "@/components/dashboard/SidebarContainer";
import { getCollectionById, type CollectionDetail } from "@/lib/db/collections";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let collection: CollectionDetail | null = null;
  let error: string | null = null;

  try {
    collection = await getCollectionById(id);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load collection";
  }

  return (
    <DashboardShell sidebar={<SidebarContainer />}>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold">{collection ? collection.name : "Collection"}</h1>
          {collection?.description && (
            <p className="text-muted-foreground">{collection.description}</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive">Failed to load collection: {error}</p>
        )}

        {!error && !collection && (
          <p className="text-sm text-muted-foreground">No such collection.</p>
        )}

        {collection && <CollectionItemsGrid collectionId={collection.id} />}
      </div>
    </DashboardShell>
  );
}
