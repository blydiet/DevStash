"use client";

import { useRouter } from "next/navigation";
import { File, Folder } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { iconMap } from "@/lib/icon-map";
import { useGlobalSearch } from "./GlobalSearchContext";
import { useItemDrawer } from "./ItemDrawerContext";
import type { SearchableItem } from "@/lib/db/items-queries";
import type { CollectionSummary } from "@/lib/db/collections";

export function GlobalSearchDialog({
  items,
  itemsTruncated,
  collections,
  itemsError = false,
  collectionsError = false,
}: {
  items: SearchableItem[];
  itemsTruncated: boolean;
  collections: CollectionSummary[];
  itemsError?: boolean;
  collectionsError?: boolean;
}) {
  const { open, setOpen } = useGlobalSearch();
  const { openItem } = useItemDrawer();
  const router = useRouter();
  const bothFailed = itemsError && collectionsError;
  const hasSearchableData = items.length > 0 || collections.length > 0;

  function handleSelectItem(id: string) {
    setOpen(false);
    openItem(id);
  }

  function handleSelectCollection(id: string) {
    setOpen(false);
    router.push(`/collections/${id}`);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Search across your items and collections"
    >
      <Command>
        <CommandInput placeholder="Search items and collections..." />
        {itemsError && !collectionsError && (
          <p className="border-b border-border px-3 py-2 text-xs text-destructive">
            Couldn&apos;t load items — showing collections only.
          </p>
        )}
        {collectionsError && !itemsError && (
          <p className="border-b border-border px-3 py-2 text-xs text-destructive">
            Couldn&apos;t load collections — showing items only.
          </p>
        )}
        <CommandList>
          <CommandEmpty>
            {bothFailed
              ? "Failed to load search data."
              : hasSearchableData
                ? "No results found."
                : "Nothing to search yet — create an item or collection first."}
          </CommandEmpty>
          {items.length > 0 && (
            <CommandGroup heading="Items">
              {items.map((item) => {
                const Icon = iconMap[item.type.icon ?? ""] ?? File;
                return (
                  <CommandItem
                    key={item.id}
                    value={item.title}
                    keywords={item.contentPreview ? [item.contentPreview] : undefined}
                    onSelect={() => handleSelectItem(item.id)}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{item.title}</span>
                      {item.contentPreview && (
                        <span className="truncate text-xs text-muted-foreground">
                          {item.contentPreview}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
          {collections.length > 0 && (
            <CommandGroup heading="Collections">
              {collections.map((collection) => (
                <CommandItem
                  key={collection.id}
                  value={collection.name}
                  onSelect={() => handleSelectCollection(collection.id)}
                >
                  <Folder className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{collection.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
        {itemsTruncated && (
          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            Showing your 500 most recent items. Older items aren&apos;t included here.
          </p>
        )}
      </Command>
    </CommandDialog>
  );
}
