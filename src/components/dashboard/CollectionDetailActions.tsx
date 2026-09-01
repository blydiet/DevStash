"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWRMutation from "swr/mutation";
import { Pencil, Star, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { EditCollectionDialog } from "@/components/dashboard/EditCollectionDialog";
import { deleteCollectionMutation } from "@/lib/swr-fetcher";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";
import type { CollectionDetail } from "@/lib/db/collections";

export function CollectionDetailActions({ collection }: { collection: CollectionDetail }) {
  const router = useRouter();
  const handleApiError = useApiErrorToast();
  const [editOpen, setEditOpen] = useState(false);
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

    toast.success("Collection deleted");
    router.push("/collections");
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className={collection.isFavorite ? "text-yellow-500" : ""}>
          <Star className={collection.isFavorite ? "fill-yellow-500" : ""} />
          <span className="hidden sm:inline">Favorite</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil />
          <span className="hidden sm:inline">Edit</span>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive"
                aria-label="Delete collection"
              />
            }
          >
            <Trash2 />
          </AlertDialogTrigger>
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
      </div>

      <EditCollectionDialog collection={collection} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
