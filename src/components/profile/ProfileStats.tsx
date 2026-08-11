import { Boxes, Folder, FolderOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getItemStats, getItemTypes, type ItemStats, type ItemTypeWithCount } from "@/lib/db/items";
import { getCollectionStats, type CollectionStats } from "@/lib/db/collections";
import { iconMap } from "@/lib/icon-map";

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function ProfileStats() {
  let itemStats: ItemStats = { total: 0, favorites: 0 };
  let collectionStats: CollectionStats = { total: 0, favorites: 0 };
  let itemTypes: ItemTypeWithCount[] = [];
  let error: string | null = null;

  try {
    [itemStats, collectionStats, itemTypes] = await Promise.all([
      getItemStats(),
      getCollectionStats(),
      getItemTypes(),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load stats";
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load stats: {error}</p>;
  }

  return (
    <Card className="rounded-[10px] lg:w-[790px]  md:w-[700px] w-[300px]">
      <CardHeader>
        <CardTitle>Usage Statistics</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#3b82f61a" }}
            >
              <Boxes className="size-5" style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{itemStats.total}</p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#f973161a" }}
            >
              <FolderOpen className="size-5" style={{ color: "#f97316" }} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{collectionStats.total}</p>
              <p className="text-sm text-muted-foreground">Collections</p>
            </div>
          </div>
        </div>

        <div>
          <p className="pb-2 text-sm text-muted-foreground">Items by Type</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {itemTypes.map((type) => {
              const Icon = iconMap[type.icon ?? ""] ?? Folder;
              return (
                <div
                  key={type.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Icon className="size-4" style={{ color: type.color ?? undefined }} />
                    {capitalize(type.name)}
                  </span>
                  <span className="text-sm font-medium">{type.itemCount}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
