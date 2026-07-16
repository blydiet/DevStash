"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Folder, Settings, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { iconMap } from "@/lib/icon-map";
import { collections, currentUser, itemTypes, type Collection } from "@/lib/mock-data";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function SectionHeader({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      {label}
    </button>
  );
}

function CollectionList({
  label,
  collections,
  trailing,
}: {
  label: string;
  collections: Collection[];
  trailing: (collection: Collection) => ReactNode;
}) {
  if (collections.length === 0) return null;

  return (
    <div>
      <p className="px-2 pb-1 text-xs tracking-wide text-muted-foreground">{label}</p>
      <ul className="flex flex-col gap-0.5">
        {collections.map((collection) => (
          <li
            key={collection.id}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
          >
            <span className="flex items-center gap-2">
              <Folder className="size-4" style={{ color: collection.color }} />
              {collection.name}
            </span>
            {trailing(collection)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar() {
  const [typesOpen, setTypesOpen] = useState(true);
  const [collectionsOpen, setCollectionsOpen] = useState(true);

  const favoriteCollections = collections.filter((c) => c.isFavorite);
  const otherCollections = collections.filter((c) => !c.isFavorite);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <SectionHeader label="Types" open={typesOpen} onToggle={() => setTypesOpen((open) => !open)} />
        {typesOpen && (
          <ul className="flex flex-col gap-0.5">
            {itemTypes.map((type) => {
              const Icon = iconMap[type.icon] ?? Folder;
              return (
                <li key={type.id}>
                  <Link
                    href={`/items/${type.name.toLowerCase()}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-4" style={{ color: type.color }} />
                      {type.name}
                    </span>
                    <span className="text-muted-foreground">{type.itemCount}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <Separator className="my-4" />

        <SectionHeader
          label="Collections"
          open={collectionsOpen}
          onToggle={() => setCollectionsOpen((open) => !open)}
        />
        {collectionsOpen && (
          <div className="flex flex-col gap-3">
            <CollectionList
              label="FAVORITES"
              collections={favoriteCollections}
              trailing={() => <Star className="size-4 fill-yellow-500 text-yellow-500" />}
            />
            <CollectionList
              label="ALL COLLECTIONS"
              collections={otherCollections}
              trailing={(collection) => (
                <span className="text-muted-foreground">{collection.itemCount}</span>
              )}
            />
          </div>
        )}
      </div>

      <Separator />

      <div className="flex items-center gap-2 p-4">
        <Avatar>
          <AvatarFallback>{initials(currentUser.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{currentUser.name}</p>
          <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="size-4" />
        </Button>
      </div>
    </div>
  );
}
