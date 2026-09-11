"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { FolderPlus, Package, PanelLeft, Plus, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateItemDialog } from "./CreateItemDialog";
import { CreateCollectionDialog } from "./CreateCollectionDialog";
import { useGlobalSearch } from "./GlobalSearchContext";

export function TopBar({
  onToggleSidebar,
  upgradeButton,
}: {
  onToggleSidebar: () => void;
  upgradeButton: ReactNode;
}) {
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
  const { setOpen: setSearchOpen } = useGlobalSearch();

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-3 sm:gap-4 sm:px-6">
      <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
        <Package className="size-5 text-primary" />
        <span className="hidden text-lg font-semibold sm:inline">DevStash</span>
      </Link>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle sidebar"
        className="shrink-0"
        onClick={onToggleSidebar}
      >
        <PanelLeft className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Favorites"
        className="shrink-0"
        nativeButton={false}
        render={<Link href="/favorites" />}
      >
        <Star className="size-4" />
      </Button>

      <div className="relative min-w-0 flex-1 lg:mx-auto lg:max-w-md lg:flex-initial">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search items"
          className="cursor-pointer pl-9 pr-9 lg:hidden"
          readOnly
          onClick={() => setSearchOpen(true)}
        />
        <Input
          placeholder="Search items..."
          className="hidden cursor-pointer pl-9 pr-14 lg:block"
          readOnly
          onClick={() => setSearchOpen(true)}
        />
        <kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground lg:block">
          ⌘K
        </kbd>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {upgradeButton}
        <Button
          variant="outline"
          size="icon"
          aria-label="New Collection"
          className="sm:w-auto sm:gap-[4px] sm:px-4"
          onClick={() => setCreateCollectionOpen(true)}
        >
          <FolderPlus className="size-4" />
          <span className="hidden sm:inline">New Collection</span>
        </Button>
        <Button size="icon" aria-label="New Item" className="sm:w-auto sm:px-4" onClick={() => setCreateItemOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">New Item</span>
        </Button>
      </div>

      <CreateItemDialog open={createItemOpen} onOpenChange={setCreateItemOpen} />
      <CreateCollectionDialog open={createCollectionOpen} onOpenChange={setCreateCollectionOpen} />
    </header>
  );
}
