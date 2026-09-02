"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderPlus, Layers, PanelLeft, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateItemDialog } from "./CreateItemDialog";
import { CreateCollectionDialog } from "./CreateCollectionDialog";
import { useGlobalSearch } from "./GlobalSearchContext";

export function TopBar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
  const { setOpen: setSearchOpen } = useGlobalSearch();

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border px-6">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
          <Layers className="size-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold">DevStash</span>
      </Link>

      <Button variant="ghost" size="icon" aria-label="Toggle sidebar" onClick={onToggleSidebar}>
        <PanelLeft className="size-4" />
      </Button>

      <div className="relative mx-auto w-full max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          className="cursor-pointer pl-9 pr-14"
          readOnly
          onClick={() => setSearchOpen(true)}
        />
        <kbd className="absolute top-1/2 right-3 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setCreateCollectionOpen(true)}>
          <FolderPlus className="size-4" />
          New Collection
        </Button>
        <Button onClick={() => setCreateItemOpen(true)}>
          <Plus className="size-4" />
          New Item
        </Button>
      </div>

      <CreateItemDialog open={createItemOpen} onOpenChange={setCreateItemOpen} />
      <CreateCollectionDialog open={createCollectionOpen} onOpenChange={setCreateCollectionOpen} />
    </header>
  );
}
