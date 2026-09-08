import { auth } from "@/auth";
import { AddTypeItemButton } from "@/components/dashboard/AddTypeItemButton";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { GlobalSearchContainer } from "@/components/dashboard/GlobalSearchContainer";
import { ItemsGrid } from "@/components/dashboard/ItemsGrid";
import { ProUpgradeNotice } from "@/components/dashboard/ProUpgradeNotice";
import { SidebarContainer } from "@/components/dashboard/SidebarContainer";
import { getItemTypeByName } from "@/lib/db/item-metadata";
import type { ItemTypeSummary } from "@/lib/db/items-queries";
import { ITEM_TYPES } from "@/lib/item-types";
import { parsePageParam } from "@/lib/pagination";
import { PRO_ONLY_ITEM_TYPES, isProOnlyItemType } from "@/lib/subscription-limits";

function formatTypeLabel(name: string) {
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}s`;
}

// Pre-composed per-type copy (rather than deriving it, e.g. via
// .toLowerCase()) so the strings stay grammatically exact. Keyed by
// PRO_ONLY_ITEM_TYPES itself (not a plain `string` index) so TypeScript
// forces a matching entry here if that list ever grows.
const PRO_UPGRADE_COPY: Record<
  (typeof PRO_ONLY_ITEM_TYPES)[number],
  { title: string; description: string }
> = {
  file: {
    title: "Files are a Pro feature",
    description: "Upgrade to Pro to start uploading and organizing files.",
  },
  image: {
    title: "Images are a Pro feature",
    description: "Upgrade to Pro to start uploading and organizing images.",
  },
};

export default async function ItemsByTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { type } = await params;
  const { page } = await searchParams;
  const currentPage = parsePageParam(page);

  let itemType: ItemTypeSummary | null = null;
  let error: string | null = null;

  try {
    itemType = await getItemTypeByName(type);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load item type";
  }

  const creatableType = itemType
    ? ITEM_TYPES.find((candidate) => candidate.value === itemType.name)
    : undefined;

  const session = await auth();
  const upgradeCopy =
    itemType && isProOnlyItemType(itemType.name) ? PRO_UPGRADE_COPY[itemType.name] : undefined;
  const isLocked = Boolean(upgradeCopy) && !session?.user?.isPro;

  return (
    <DashboardShell sidebar={<SidebarContainer />} search={<GlobalSearchContainer />}>
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
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
          {creatableType && !isLocked && (
            <AddTypeItemButton type={creatableType.value} label={creatableType.label} />
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive">Failed to load item type: {error}</p>
        )}

        {!error && !itemType && (
          <p className="text-sm text-muted-foreground">No such item type.</p>
        )}

        {itemType && isLocked && upgradeCopy && (
          <ProUpgradeNotice title={upgradeCopy.title} description={upgradeCopy.description} />
        )}

        {itemType && !isLocked && <ItemsGrid typeName={itemType.name} page={currentPage} />}
      </div>
    </DashboardShell>
  );
}
