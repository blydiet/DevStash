"use client";

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

interface DeleteCollectionAlertDialogProps {
  collectionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

// Shared by CollectionActionsMenu and CollectionDetailActions — both are
// externally controlled (open/onOpenChange come from the caller's own
// state, not an AlertDialogTrigger child) since CollectionActionsMenu's
// "Delete" click originates from a DropdownMenuItem and needs the confirm
// dialog to open only once the dropdown itself has closed.
export function DeleteCollectionAlertDialog({
  collectionName,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteCollectionAlertDialogProps) {
  // AlertDialogCancel's disabled state alone doesn't stop Escape/backdrop
  // dismissal — Base UI's AlertDialog.Root still closes on either regardless
  // of that button's state, since nothing else guards onOpenChange. Ignoring
  // the request while a delete is in flight keeps every dismissal path
  // (Cancel, Escape, backdrop) consistently blocked, so an error toast can't
  // land after the dialog's already gone.
  function handleOpenChange(nextOpen: boolean) {
    if (isDeleting) return;
    onOpenChange(nextOpen);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes &ldquo;{collectionName}&rdquo;. Items in this collection will not be
            deleted - they&apos;ll just no longer be part of this collection. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDeleting} variant="destructive">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
