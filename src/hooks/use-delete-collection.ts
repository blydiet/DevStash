"use client";

import { toast } from "sonner";
import useSWRMutation from "swr/mutation";
import { deleteCollectionMutation } from "@/lib/swr-fetcher";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";

// Shared by CollectionActionsMenu (closes the confirm dialog and
// router.refresh()es to drop the deleted collection from the list/sidebar
// counts) and CollectionDetailActions (router.push()es away from the
// collection page being deleted, since it no longer exists) — same
// mutation, same error handling, same success toast; the two callers
// differ only in what "done" means, passed in as onDeleted.
export function useDeleteCollection(collectionId: string, onDeleted: () => void) {
  const handleApiError = useApiErrorToast();
  const { trigger, isMutating } = useSWRMutation(
    `/api/collections/${collectionId}`,
    deleteCollectionMutation
  );

  async function handleDelete() {
    if (isMutating) return;

    try {
      await trigger();
    } catch (err) {
      handleApiError(err, "Failed to delete collection");
      return;
    }

    toast.success("Collection deleted");
    onDeleted();
  }

  return { handleDelete, isDeleting: isMutating };
}
