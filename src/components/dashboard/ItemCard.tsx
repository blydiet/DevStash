"use client";

import { File, Pin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { iconMap } from "@/lib/icon-map";
import { useItemDrawer } from "./ItemDrawerContext";
import type { ItemSummary } from "@/lib/db/items";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ItemCard({ item }: { item: ItemSummary }) {
  const { openItem } = useItemDrawer();
  const Icon = iconMap[item.type.icon ?? ""] ?? File;

  return (
    <Card
      className="cursor-pointer border-l-4 border-y-0 border-r-0 transition-colors hover:bg-muted/50"
      style={{ borderLeftColor: item.type.color ?? undefined }}
      onClick={() => openItem(item.id)}
    >
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${item.type.color}1a` }}
          >
            <Icon className="size-4" style={{ color: item.type.color ?? undefined }} />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {item.isPinned && <Pin className="size-3.5 text-muted-foreground" />}
            {item.isFavorite && (
              <Star className="size-3.5 fill-yellow-500 text-yellow-500" />
            )}
          </div>
        </div>
        <div className="min-w-0">
          <p className="break-words font-medium">{item.title}</p>
          {item.description && (
            <p className="break-words text-sm text-muted-foreground">{item.description}</p>
          )}
        </div>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground">{formatDate(item.createdAt)}</p>
      </CardContent>
    </Card>
  );
}
