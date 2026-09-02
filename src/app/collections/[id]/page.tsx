import { CollectionDetailActions } from "@/components/dashboard/CollectionDetailActions";
import { CollectionItemsGrid } from "@/components/dashboard/CollectionItemsGrid";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { GlobalSearchContainer } from "@/components/dashboard/GlobalSearchContainer";
import { SidebarContainer } from "@/components/dashboard/SidebarContainer";
import { getCollectionById, type CollectionDetail } from "@/lib/db/collections";
import { parsePageParam } from "@/lib/pagination";

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page } = await searchParams;
  const currentPage = parsePageParam(page);

  let collection: CollectionDetail | null = null;
  let error: string | null = null;

  try {
    collection = await getCollectionById(id);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load collection";
  }

  return (
    <DashboardShell sidebar={<SidebarContainer />} search={<GlobalSearchContainer />}>
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{collection ? collection.name : "Collection"}</h1>
            {collection?.description && (
              <p className="text-muted-foreground">{collection.description}</p>
            )}
          </div>
          {collection && <CollectionDetailActions collection={collection} />}
        </div>

        {error && (
          <p className="text-sm text-destructive">Failed to load collection: {error}</p>
        )}

        {!error && !collection && (
          <p className="text-sm text-muted-foreground">No such collection.</p>
        )}

        {collection && <CollectionItemsGrid collectionId={collection.id} page={currentPage} />}
      </div>
    </DashboardShell>
  );
}
