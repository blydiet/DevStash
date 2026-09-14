"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { File, Folder, Loader2 } from "lucide-react";
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
import { fetchGlobalSearchData } from "@/lib/swr-fetcher";
import { useGlobalSearch } from "./GlobalSearchContext";
import { useItemDrawer } from "./ItemDrawerContext";

export function GlobalSearchDialog() {
  const { open, setOpen } = useGlobalSearch();
  const { openItem } = useItemDrawer();
  const router = useRouter();

  // Fetched only once the dialog is actually opened (SWR's key is `null`
  // while closed) rather than eagerly on every dashboard page load, since
  // most sessions never open Cmd+K at all. SWR caches the result across
  // opens/closes, so this only costs a real fetch on the first open.
  const { data, error: fetchError } = useSWR(open ? "/api/search" : null, fetchGlobalSearchData);

  const items = data?.items ?? [];
  const itemsTruncated = data?.itemsTruncated ?? false;
  const collections = data?.collections ?? [];
  const itemsError = fetchError !== undefined || (data?.itemsError ?? false);
  const collectionsError = fetchError !== undefined || (data?.collectionsError ?? false);
  const isLoading = open && !data && !fetchError;
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
            {isLoading ? (
              <span className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </span>
            ) : bothFailed ? (
              "Failed to load search data."
            ) : hasSearchableData ? (
              "No results found."
            ) : (
              "Nothing to search yet — create an item or collection first."
            )}
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
