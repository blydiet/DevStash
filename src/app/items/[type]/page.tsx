import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ItemsGrid } from "@/components/dashboard/ItemsGrid";
import { SidebarContainer } from "@/components/dashboard/SidebarContainer";
import { getItemTypeByName, type ItemTypeSummary } from "@/lib/db/items";

function formatTypeLabel(name: string) {
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}s`;
}

export default async function ItemsByTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;

  let itemType: ItemTypeSummary | null = null;
  let error: string | null = null;

  try {
    itemType = await getItemTypeByName(type);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load item type";
  }

  return (
    <DashboardShell sidebar={<SidebarContainer />}>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold">
            {itemType ? formatTypeLabel(itemType.name) : "Items"}
          </h1>
          <p className="text-muted-foreground">
            {itemType
              ? `All your ${formatTypeLabel(itemType.name).toLowerCase()}`
              : "Browse items by type"}
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive">Failed to load item type: {error}</p>
        )}

        {!error && !itemType && (
          <p className="text-sm text-muted-foreground">No such item type.</p>
        )}

        {itemType && <ItemsGrid typeName={itemType.name} />}
      </div>
    </DashboardShell>
  );
}
