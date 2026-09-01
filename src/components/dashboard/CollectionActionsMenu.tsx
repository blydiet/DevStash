"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWRMutation from "swr/mutation";
import { MoreVertical, Pencil, Star, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { EditCollectionDialog } from "@/components/dashboard/EditCollectionDialog";
import { deleteCollectionMutation } from "@/lib/swr-fetcher";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";

interface CollectionActionsMenuProps {
  collection: { id: string; name: string; description: string | null; isFavorite: boolean };
}

export function CollectionActionsMenu({ collection }: CollectionActionsMenuProps) {
  const router = useRouter();
  const handleApiError = useApiErrorToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { trigger, isMutating } = useSWRMutation(
    `/api/collections/${collection.id}`,
    deleteCollectionMutation,
  );

  async function handleDelete() {
    try {
      await trigger();
    } catch (err) {
      handleApiError(err, "Failed to delete collection");
      return;
    }

    setDeleteOpen(false);
    toast.success("Collection deleted");
    router.refresh();
  }

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
          <DropdownMenuItem>
            <Star className={collection.isFavorite ? "fill-yellow-500 text-yellow-500" : ""} />
            Favorite
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCollectionDialog collection={collection} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes &ldquo;{collection.name}&rdquo;. Items in this collection will not be
              deleted — they&apos;ll just no longer be part of it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isMutating} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
