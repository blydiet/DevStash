import { Boxes, FolderOpen, Heart, Star, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { collections, items } from "@/lib/mock-data";

const stats: { label: string; value: number; icon: LucideIcon }[] = [
  { label: "Items", value: items.length, icon: Boxes },
  { label: "Collections", value: collections.length, icon: FolderOpen },
  { label: "Favorite Items", value: items.filter((i) => i.isFavorite).length, icon: Star },
  {
    label: "Favorite Collections",
    value: collections.filter((c) => c.isFavorite).length,
    icon: Heart,
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-4 text-muted-foreground"  />
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
