"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Star, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CollectionFormDialog } from "@/components/dashboard/CollectionFormDialog";
import { DeleteCollectionAlertDialog } from "@/components/dashboard/DeleteCollectionAlertDialog";
import { useDeleteCollection } from "@/hooks/use-delete-collection";
import { useToggleCollectionFavorite } from "@/hooks/use-toggle-collection-favorite";

interface CollectionActionsMenuProps {
  collection: { id: string; name: string; description: string | null; isFavorite: boolean };
}

export function CollectionActionsMenu({ collection }: CollectionActionsMenuProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { handleDelete, isDeleting } = useDeleteCollection(collection.id, () => {
    setDeleteOpen(false);
    router.refresh();
  });
  const {
    isFavorite,
    toggle: toggleFavorite,
    isTogglingFavorite,
  } = useToggleCollectionFavorite(collection.id, collection.isFavorite);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label="Collection actions" />}
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isTogglingFavorite} onClick={toggleFavorite}>
            <Star className={isFavorite ? "fill-yellow-500 text-yellow-500" : ""} />
            Favorite
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
