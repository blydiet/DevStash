"use client";

import useSWR from "swr";
import { Calendar, Copy, File, FolderOpen, Pencil, Pin, Star, Tag, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { iconMap } from "@/lib/icon-map";
import type { ItemDetail } from "@/lib/db/items";

async function fetcher(url: string): Promise<ItemDetail> {
  const res = await fetch(url);
  const body = await res.json();

  if (!res.ok || !body.success) {
    throw new Error(body.error ?? "Failed to load item");
  }

  return body.data as ItemDetail;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ItemDrawerSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-6 w-40" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function ItemDrawer({
  itemId,
  open,
  onOpenChange,
}: {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    data: item,
    error,
    isLoading,
  } = useSWR(open && itemId ? `/api/items/${itemId}` : null, fetcher);

  const Icon = item ? (iconMap[item.type.icon ?? ""] ?? File) : File;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        {isLoading && <ItemDrawerSkeleton />}

        {!isLoading && error && (
          <p className="p-6 text-sm text-destructive">
            Failed to load item: {error instanceof Error ? error.message : "Unknown error"}
          </p>
        )}

        {!isLoading && !error && item && (
          <>
            <SheetHeader className="gap-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${item.type.color}1a` }}
                >
                  <Icon className="size-5" style={{ color: item.type.color ?? undefined }} />
                </div>
                <SheetTitle className="pr-8">{item.title}</SheetTitle>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{item.type.name}</Badge>
                {item.language && <Badge variant="secondary">{item.language}</Badge>}
              </div>
            </SheetHeader>

            <div className="flex items-center gap-1 border-b border-border p-4">
              <Button
                variant="ghost"
                size="sm"
                className={item.isFavorite ? "text-yellow-500" : ""}
              >
                <Star className={item.isFavorite ? "fill-yellow-500" : ""} />
                <span className="hidden sm:inline">Favorite</span>
              </Button>
              <Button variant="ghost" size="sm">
                <Pin />
                <span className="hidden sm:inline">Pin</span>
              </Button>
              <Button variant="ghost" size="sm">
                <Copy />
                <span className="hidden sm:inline">Copy</span>
              </Button>
              <Button variant="ghost" size="sm" className="ml-auto">
                <Pencil />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-destructive">
                <Trash2 />
              </Button>
            </div>

            <div className="flex flex-col gap-6 p-6">
              {item.description && (
                <div>
                  <h3 className="pb-2 text-sm font-medium text-muted-foreground">Description</h3>
                  <p className="text-sm">{item.description}</p>
                </div>
              )}

              {item.content && (
                <div>
                  <h3 className="pb-2 text-sm font-medium text-muted-foreground">Content</h3>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
                    <code>{item.content}</code>
                  </pre>
                </div>
              )}

              {item.url && (
                <div>
                  <h3 className="pb-2 text-sm font-medium text-muted-foreground">URL</h3>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-sm text-primary underline underline-offset-4"
                  >
                    {item.url}
                  </a>
                </div>
              )}

              {item.fileName && (
                <div>
                  <h3 className="pb-2 text-sm font-medium text-muted-foreground">File</h3>
                  <p className="break-all text-sm">{item.fileName}</p>
                </div>
              )}

              {item.tags.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-1.5 pb-2 text-sm font-medium text-muted-foreground">
                    <Tag className="size-4" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {item.collection && (
                <div>
                  <h3 className="flex items-center gap-1.5 pb-2 text-sm font-medium text-muted-foreground">
                    <FolderOpen className="size-4" />
                    Collections
                  </h3>
                  <Badge variant="secondary">{item.collection.name}</Badge>
                </div>
              )}

              <div>
                <h3 className="flex items-center gap-1.5 pb-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="size-4" />
                  Details
                </h3>
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{formatDate(item.createdAt as unknown as string)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Updated</span>
                    <span>{formatDate(item.updatedAt as unknown as string)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
