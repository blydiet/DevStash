import { Boxes, FolderOpen, Heart, Star, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { collections, items } from "@/lib/mock-data";

const stats: { label: string; value: number; icon: LucideIcon; color: string }[] = [
  { label: "Items", value: items.length, icon: Boxes, color: "#3b82f6" },
  { label: "Collections", value: collections.length, icon: FolderOpen, color: "#f97316" },
  {
    label: "Favorite Items",
    value: items.filter((i) => i.isFavorite).length,
    icon: Star,
    color: "#eab308",
  },
  {
    label: "Favorite Collections",
    value: collections.filter((c) => c.isFavorite).length,
    icon: Heart,
    color: "#a855f7",
  },
];

export function StatsCards() {
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
