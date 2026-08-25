"use client";

import { ImageOff, Pin, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useItemDrawer } from "./ItemDrawerContext";
import type { ItemSummary } from "@/lib/db/items";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ImageCard({ item }: { item: ItemSummary }) {
  const { openItem } = useItemDrawer();

  return (
    <Card
      className="cursor-pointer gap-3 overflow-hidden rounded py-0 transition-colors hover:bg-muted/50"
      onClick={() => openItem(item.id)}
    >
      <div
        className="relative aspect-video overflow-hidden border-b-4"
        style={{ borderBottomColor: item.type.color ?? undefined }}
      >
        {item.fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.fileUrl}
            alt={item.title}
            className="size-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted">
            <ImageOff className="size-6 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {item.isPinned && <Pin className="size-3.5 text-white drop-shadow" />}
          {item.isFavorite && (
            <Star className="size-3.5 fill-yellow-500 text-yellow-500 drop-shadow" />
          )}
        </div>
      </div>
      <CardContent className="flex flex-col gap-1 pb-4">
        <p className="truncate font-medium">{item.title}</p>
        <p className="text-sm text-muted-foreground">{formatDate(item.createdAt)}</p>
      </CardContent>
    </Card>
  );
}
