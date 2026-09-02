import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { GlobalSearchContainer } from "@/components/dashboard/GlobalSearchContainer";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { SidebarContainer } from "@/components/dashboard/SidebarContainer";
import { getCollectionsPage, type CollectionSummary } from "@/lib/db/collections";
import { COLLECTIONS_PER_PAGE, getTotalPages, parsePageParam } from "@/lib/pagination";

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const requestedPage = parsePageParam(page);

  let collections: CollectionSummary[] = [];
  let totalCount = 0;
  let currentPage = requestedPage;
  let error: string | null = null;

  try {
    const result = await getCollectionsPage(requestedPage);
    collections = result.collections;
    totalCount = result.totalCount;
    currentPage = result.currentPage;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load collections";
  }

  const totalPages = getTotalPages(totalCount, COLLECTIONS_PER_PAGE);

  return (
    <DashboardShell sidebar={<SidebarContainer />} search={<GlobalSearchContainer />}>
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
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              basePath="/collections"
            />
          </>
        )}
      </div>
    </DashboardShell>
  );
}
