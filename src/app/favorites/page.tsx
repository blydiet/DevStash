import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { FavoritesList } from "@/components/dashboard/FavoritesList";
import { GlobalSearchContainer } from "@/components/dashboard/GlobalSearchContainer";
import { SidebarContainer } from "@/components/dashboard/SidebarContainer";
import { getFavoriteCollections, type FavoriteCollection } from "@/lib/db/collections";
import { getFavoriteItems, type FavoriteItem } from "@/lib/db/items-queries";

function isNotAuthenticated(reason: unknown) {
  return reason instanceof Error && reason.message === "Not authenticated";
}

export default async function FavoritesPage() {
  const [itemsResult, collectionsResult] = await Promise.allSettled([
    getFavoriteItems(),
    getFavoriteCollections(),
  ]);

  if (
    (itemsResult.status === "rejected" && isNotAuthenticated(itemsResult.reason)) ||
    (collectionsResult.status === "rejected" && isNotAuthenticated(collectionsResult.reason))
  ) {
    redirect("/sign-in?callbackUrl=/favorites");
  }

  const itemsError = itemsResult.status === "rejected";
  if (itemsError) {
    console.error("Failed to load favorite items", itemsResult.reason);
  }
  const items: FavoriteItem[] = itemsResult.status === "fulfilled" ? itemsResult.value : [];

  const collectionsError = collectionsResult.status === "rejected";
  if (collectionsError) {
    console.error("Failed to load favorite collections", collectionsResult.reason);
  }
  const collections: FavoriteCollection[] =
    collectionsResult.status === "fulfilled" ? collectionsResult.value : [];

  return (
    <DashboardShell sidebar={<SidebarContainer />} search={<GlobalSearchContainer />}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Favorites</h1>
          <p className="text-muted-foreground">Your starred items and collections</p>
        </div>

        <FavoritesList
          items={items}
          collections={collections}
          itemsError={itemsError}
          collectionsError={collectionsError}
        />
      </div>
    </DashboardShell>
  );
}
