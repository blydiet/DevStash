"use client";

import { File, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { iconMap } from "@/lib/icon-map";
import { clickableRowProps } from "@/lib/clickable-row";
import { useItemDrawer } from "./ItemDrawerContext";
import { useToggleItemFavorite } from "@/hooks/use-toggle-item-favorite";
import { FavoriteToggleButton } from "@/components/dashboard/FavoriteToggleButton";
import { IconBadge } from "@/components/shared/IconBadge";
import { formatShortDate } from "@/lib/format-date";
import type { ItemSummary } from "@/lib/db/items-queries";

export function ItemRow({ item }: { item: ItemSummary }) {
  const { openItem } = useItemDrawer();
  const Icon = iconMap[item.type.icon ?? ""] ?? File;
  const {
    isFavorite,
    toggle: toggleFavorite,
    isTogglingFavorite,
  } = useToggleItemFavorite(item.id, item.isFavorite);

  return (
    <Card
      className="cursor-pointer rounded-l-none border-l-4 border-y-0 border-r-0 transition-colors hover:bg-muted/50"
      style={{ borderLeftColor: item.type.color ?? undefined }}
      {...clickableRowProps(() => openItem(item.id), `View ${item.title}`)}
    >
      <CardContent className="flex items-center gap-4">
        <IconBadge icon={Icon} color={item.type.color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-medium">{item.title}</p>
            {item.isPinned && <Pin className="size-3.5 shrink-0 text-muted-foreground" />}
            <FavoriteToggleButton
              isFavorite={isFavorite}
              isPending={isTogglingFavorite}
              onToggle={toggleFavorite}
              className="size-6 shrink-0"
            />
          </div>
          {item.description && (
            <p className="truncate text-sm text-muted-foreground">{item.description}</p>
          )}
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
        <p className="shrink-0 text-sm text-muted-foreground">{formatShortDate(item.createdAt)}</p>
      </CardContent>
    </Card>
  );
}
