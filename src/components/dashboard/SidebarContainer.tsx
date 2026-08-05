import { getRecentCollections, type CollectionSummary } from "@/lib/db/collections";
import { getItemTypes, type ItemTypeWithCount } from "@/lib/db/items";
import { getCurrentUser, type CurrentUser } from "@/lib/db/user";
import { signOutAction } from "@/actions/auth";
import { Sidebar } from "./Sidebar";

export async function SidebarContainer() {
  let itemTypes: ItemTypeWithCount[] = [];
  let collections: CollectionSummary[] = [];
  let currentUser: CurrentUser = { name: "", email: "", image: null };
  let error: string | null = null;

  try {
    [itemTypes, collections, currentUser] = await Promise.all([
      getItemTypes(),
      getRecentCollections(),
      getCurrentUser(),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load sidebar data";
  }

  if (error) {
    return <p className="p-4 text-sm text-destructive">Failed to load sidebar: {error}</p>;
  }

  return (
    <Sidebar
      itemTypes={itemTypes}
      collections={collections}
      currentUser={currentUser}
      signOutAction={signOutAction}
    />
  );
}
