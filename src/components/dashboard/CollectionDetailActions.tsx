"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollectionFormDialog } from "@/components/dashboard/CollectionFormDialog";
import { DeleteCollectionAlertDialog } from "@/components/dashboard/DeleteCollectionAlertDialog";
import { useDeleteCollection } from "@/hooks/use-delete-collection";
import { useToggleCollectionFavorite } from "@/hooks/use-toggle-collection-favorite";
import type { CollectionDetail } from "@/lib/db/collections";

export function CollectionDetailActions({ collection }: { collection: CollectionDetail }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { handleDelete, isDeleting } = useDeleteCollection(collection.id, () => {
    router.push("/collections");
  });
  const {
    isFavorite,
    toggle: toggleFavorite,
    isTogglingFavorite,
  } = useToggleCollectionFavorite(collection.id, collection.isFavorite);

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={isFavorite ? "text-yellow-500" : ""}
          disabled={isTogglingFavorite}
          onClick={toggleFavorite}
        >
          <Star className={isFavorite ? "fill-yellow-500" : ""} />
          <span className="sr-only sm:not-sr-only sm:inline">Favorite</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil />
          <span className="sr-only sm:not-sr-only sm:inline">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive"
          aria-label="Delete collection"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 />
        </Button>
      </div>

      <CollectionFormDialog collection={collection} open={editOpen} onOpenChange={setEditOpen} />

      <DeleteCollectionAlertDialog
        collectionName={collection.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}
