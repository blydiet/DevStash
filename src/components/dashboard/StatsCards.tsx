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
    <div className="grid grid-cols-1 gap-4 grid-cols-2 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="justify-center">
          {/* Icon+value share a row and the label gets the full card width on
              its own row below — deliberately not "icon beside a stacked
              value/label column" (which used to be the >426px layout here).
              That layout depends on a fixed-px viewport-width breakpoint to
              swap to this one on narrow *screens*, but a user's browser
              "default font size" accessibility setting scales rem-based text
              (text-sm/text-2xl here) without changing the viewport's CSS
              pixel width at all, so that breakpoint never fires — the narrow
              value/label column then has no room for a real word ("Favorite",
              "Collections") at the larger size, and break-words falls back to
              splitting every word letter-by-letter. This single layout is
              width-independent: the label always gets the whole card to wrap
              across normally, regardless of screen size or text scale. */}
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${color}1a` }}
              >
                <Icon className="size-4" style={{ color }} />
              </div>
              <p className="text-2xl font-bold leading-none">{value}</p>
            </div>
            <p className="text-sm text-muted-foreground">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
