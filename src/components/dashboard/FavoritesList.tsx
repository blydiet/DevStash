"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Folder, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { iconMap } from "@/lib/icon-map";
import { useItemDrawer } from "./ItemDrawerContext";
import type { FavoriteItem } from "@/lib/db/items-queries";
import type { FavoriteCollection } from "@/lib/db/collections";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type SortField = "date" | "name" | "type";
type SortDirection = "asc" | "desc";

const SORT_FIELD_LABELS: Record<SortField, string> = {
  date: "Date",
  name: "Name",
  type: "Item Type",
};

function sortItems(items: FavoriteItem[], field: SortField, direction: SortDirection) {
  const sorted = [...items].sort((a, b) => {
    switch (field) {
      case "name":
        return a.title.localeCompare(b.title);
      case "type":
        return a.type.name.localeCompare(b.type.name);
      case "date":
      default:
        // Intentionally sorts by createdAt, not updatedAt — matches what's displayed;
        // may differ from the server's initial ordering.
        return a.createdAt.getTime() - b.createdAt.getTime();
    }
  });
  return direction === "asc" ? sorted : sorted.reverse();
}

export function FavoritesList({
  items,
  collections,
  itemsError,
  collectionsError,
}: {
  items: FavoriteItem[];
  collections: FavoriteCollection[];
  itemsError: boolean;
  collectionsError: boolean;
}) {
  const { openItem } = useItemDrawer();
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const isEmpty =
    !itemsError && !collectionsError && items.length === 0 && collections.length === 0;
  const sortedItems = sortItems(items, sortField, sortDirection);

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Star className="size-8 text-muted-foreground" />
        <p className="font-mono text-sm">No favorites yet</p>
        <p className="text-xs text-muted-foreground">
          Star items or collections to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {(items.length > 0 || itemsError) && (
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Items{!itemsError && ` (${items.length})`}
            </h2>
            {!itemsError && items.length > 0 && (
              <div className="flex items-center rounded-[5px] border border-input">
                <Select
                  value={sortField}
                  onValueChange={(value) => setSortField(value as SortField)}
                >
                  <SelectTrigger
                    aria-label="Sort items by"
                    className="h-7 w-[112px] rounded-r-none border-0 font-mono text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {(Object.keys(SORT_FIELD_LABELS) as SortField[]).map((field) => (
                      <SelectItem key={field} value={field} className="font-mono text-xs">
                        {SORT_FIELD_LABELS[field]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-l-none border-l border-input"
                  onClick={() =>
                    setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
                  }
                  aria-label={sortDirection === "asc" ? "Sort descending" : "Sort ascending"}
                >
                  {sortDirection === "asc" ? (
                    <ArrowUp className="size-3.5" />
                  ) : (
                    <ArrowDown className="size-3.5" />
                  )}
                </Button>
              </div>
            )}
          </div>
          {itemsError ? (
            <p className="font-mono text-sm text-destructive">Failed to load favorite items.</p>
          ) : (
            <div className="rounded-md border border-border/40">
              {sortedItems.map((item) => {
                const Icon = iconMap[item.type.icon ?? ""] ?? Folder;
                return (
                  <div
                    key={item.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-border/40 px-3 py-1.5 font-mono text-sm last:border-b-0 hover:bg-muted/50"
                    onClick={() => openItem(item.id)}
                  >
                    <Icon
                      className="size-3.5 shrink-0"
                      style={{ color: item.type.color ?? undefined }}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {item.type.name}
                    </span>
                    <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {(collections.length > 0 || collectionsError) && (
        <section>
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
            Collections{!collectionsError && ` (${collections.length})`}
          </h2>
          {collectionsError ? (
            <p className="font-mono text-sm text-destructive">
              Failed to load favorite collections.
            </p>
          ) : (
            <div className="rounded-md border border-border/40">
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  className="flex items-center gap-3 border-b border-border/40 px-3 py-1.5 font-mono text-sm last:border-b-0 hover:bg-muted/50"
                >
                  <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{collection.name}</span>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Collection
                  </span>
                  <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                    {formatDate(collection.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
