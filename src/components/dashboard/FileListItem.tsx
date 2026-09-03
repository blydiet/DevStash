"use client";

import { Download, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_FILE_ICON, EXTENSION_ICONS, formatFileSize, getExtension } from "@/lib/file-constraints";
import { useItemDrawer } from "./ItemDrawerContext";
import { useToggleItemFavorite } from "@/hooks/use-toggle-item-favorite";
import { FavoriteToggleButton } from "@/components/dashboard/FavoriteToggleButton";
import type { ItemSummary } from "@/lib/db/items-queries";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FileListItem({ item }: { item: ItemSummary }) {
  const { openItem } = useItemDrawer();
  const Icon = EXTENSION_ICONS[getExtension(item.fileName ?? item.title)] ?? DEFAULT_FILE_ICON;
  const {
    isFavorite,
    toggle: toggleFavorite,
    isTogglingFavorite,
  } = useToggleItemFavorite(item.id, item.isFavorite);

  return (
    <div
      className="flex cursor-pointer flex-col gap-2 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-4"
      onClick={() => openItem(item.id)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${item.type.color}1a` }}
        >
          <Icon className="size-4" style={{ color: item.type.color ?? undefined }} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{item.fileName ?? item.title}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:hidden">
          {item.isPinned && <Pin className="size-3.5 text-muted-foreground" />}
          <FavoriteToggleButton
            isFavorite={isFavorite}
            isPending={isTogglingFavorite}
            onToggle={toggleFavorite}
            className="size-6"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {item.fileSize != null && <span>{formatFileSize(item.fileSize)}</span>}
          <span>{formatDate(item.createdAt)}</span>
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          {item.isPinned && <Pin className="size-3.5 text-muted-foreground" />}
          <FavoriteToggleButton
            isFavorite={isFavorite}
            isPending={isTogglingFavorite}
            onToggle={toggleFavorite}
            className="size-6"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<a href={`/api/items/${item.id}/download`} />}
          onClick={(event) => event.stopPropagation()}
          aria-label="Download file"
        >
          <Download className="size-4" />
        </Button>
      </div>
    </div>
  );
}
