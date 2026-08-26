import { Boxes, FolderOpen, Heart, Star, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getCollectionStats, type CollectionStats } from "@/lib/db/collections";
import { getItemStats, type ItemStats } from "@/lib/db/item-metadata";

export async function StatsCards() {
  let itemStats: ItemStats = { total: 0, favorites: 0 };
  let collectionStats: CollectionStats = { total: 0, favorites: 0 };
  let error: string | null = null;

  try {
    [itemStats, collectionStats] = await Promise.all([getItemStats(), getCollectionStats()]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load stats";
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load stats: {error}</p>;
  }

  const stats: { label: string; value: number; icon: LucideIcon; color: string }[] = [
    { label: "Items", value: itemStats.total, icon: Boxes, color: "#3b82f6" },
    { label: "Collections", value: collectionStats.total, icon: FolderOpen, color: "#f97316" },
    { label: "Favorite Items", value: itemStats.favorites, icon: Star, color: "#eab308" },
    {
      label: "Favorite Collections",
      value: collectionStats.favorites,
      icon: Heart,
      color: "#a855f7",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-3">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}1a` }}
            >
              <Icon className="size-4" style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
