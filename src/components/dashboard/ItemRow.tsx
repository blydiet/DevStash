import { File, Pin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { iconMap } from "@/lib/icon-map";
import { itemTypes, type Item } from "@/lib/mock-data";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ItemRow({ item }: { item: Item }) {
  const type = itemTypes.find((t) => t.id === item.typeId);
  const Icon = iconMap[type?.icon ?? ""] ?? File;

  return (
    <Card
      className="border-l-4 border-y-0 border-r-0"
      style={{ borderLeftColor: type?.color }}
    >
      <CardContent className="flex items-center gap-4">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${type?.color}1a` }}
        >
          <Icon className="size-4" style={{ color: type?.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-medium">{item.title}</p>
            {item.isPinned && <Pin className="size-3.5 shrink-0 text-muted-foreground" />}
            {item.isFavorite && (
              <Star className="size-3.5 shrink-0 fill-yellow-500 text-yellow-500" />
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">{item.description}</p>
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <p className="shrink-0 text-sm text-muted-foreground">{formatDate(item.createdAt)}</p>
      </CardContent>
    </Card>
  );
}
