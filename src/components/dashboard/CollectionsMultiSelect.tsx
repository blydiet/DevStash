"use client";

import { ChevronDown, FolderOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { CollectionOption } from "@/lib/db/collections";

interface CollectionsMultiSelectProps {
  collections: CollectionOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  hasError?: boolean;
  className?: string;
}

export function CollectionsMultiSelect({
  collections,
  selectedIds,
  onChange,
  hasError = false,
  className,
}: CollectionsMultiSelectProps) {
  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...selectedIds, id] : selectedIds.filter((selectedId) => selectedId !== id));
  }

  const label =
    selectedIds.length === 0
      ? "No collections"
      : collections
          .filter((collection) => selectedIds.includes(collection.id))
          .map((collection) => collection.name)
          .join(", ");

  const triggerText = hasError
    ? selectedIds.length > 0
      ? `Failed to load collection names (${selectedIds.length} selected)`
      : "Failed to load collections"
    : collections.length === 0
      ? "No collections yet"
      : label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={collections.length === 0}
        className={cn(
          "flex h-8 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30",
          className
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate text-left">
          <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "truncate",
              hasError ? "text-destructive" : selectedIds.length === 0 && "text-muted-foreground"
            )}
          >
            {triggerText}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {collections.map((collection) => (
          <DropdownMenuCheckboxItem
            key={collection.id}
            checked={selectedIds.includes(collection.id)}
            onCheckedChange={(checked) => toggle(collection.id, checked)}
          >
            {collection.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
