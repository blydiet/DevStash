"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWRMutation from "swr/mutation";
import FocusLock from "react-focus-lock";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogCloseXButton } from "@/components/dashboard/DialogCloseXButton";
import { saveCollectionMutation } from "@/lib/swr-fetcher";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";

const EMPTY_FORM = { name: "", description: "" };

interface CollectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Omit for create mode (TopBar's "New Collection"); pass the collection
  // being edited for edit mode (CollectionActionsMenu/CollectionDetailActions).
  collection?: { id: string; name: string; description: string | null };
}

// Shared by TopBar (create) and CollectionActionsMenu/CollectionDetailActions
// (edit) — same fields, same dialog chrome, same save/close/reset flow;
// differing only in which endpoint/method the save hits and the title/button
// copy. One useSWRMutation hook, keyed to the real endpoint for the current
// mode, with saveCollectionMutation branching POST vs PATCH off `arg.method`.
export function CollectionFormDialog({ open, onOpenChange, collection }: CollectionFormDialogProps) {
  const isEdit = collection !== undefined;
  const router = useRouter();
  const handleApiError = useApiErrorToast();
  const [form, setForm] = useState(
    collection ? { name: collection.name, description: collection.description ?? "" } : EMPTY_FORM
  );
  const { trigger, isMutating } = useSWRMutation(
    collection ? `/api/collections/${collection.id}` : "/api/collections",
    saveCollectionMutation
  );

  // Reset (create) or resync (edit, in case the collection changed since
  // last opened) whenever the dialog opens. This has to be driven by the
  // `open` *prop* itself (React's adjust-state-during-render pattern,
  // comparing against a tracked previous value), not by an `onOpenChange`
  // callback: every caller here (TopBar, CollectionActionsMenu,
  // CollectionDetailActions) toggles `open` externally via its own state
  // setter rather than through the Dialog's internal trigger, and Base UI's
  // Dialog.Root only calls `onOpenChange` for its own internally-initiated
  // dismissals (Escape, backdrop click) — never in response to the `open`
  // prop changing out from under it. A callback-based reset here would
  // silently never fire for the open transition, only the close one.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm(
        collection ? { name: collection.name, description: collection.description ?? "" } : EMPTY_FORM
      );
    }
  }

  async function handleSave() {
    try {
      await trigger({
        method: isEdit ? "PATCH" : "POST",
        name: form.name,
        description: form.description.trim() === "" ? null : form.description,
      });
    } catch (err) {
      handleApiError(err, `Failed to ${isEdit ? "update" : "create"} collection`);
      return;
    }

    toast.success(isEdit ? "Collection updated" : "Collection created");
    onOpenChange(false);
    router.refresh();
  }

  const canSave = form.name.trim() !== "";
  const idPrefix = isEdit ? "edit-collection" : "collection";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[5px]" showCloseButton={false}>
        <FocusLock returnFocus className="contents">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Collection" : "New Collection"}</DialogTitle>
          </DialogHeader>
          <DialogCloseXButton />

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${idPrefix}-name`}>Name</Label>
              <Input
                id={`${idPrefix}-name`}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Name"
                className="rounded-[5px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${idPrefix}-description`}>Description</Label>
              <Textarea
                id={`${idPrefix}-description`}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description"
                className="rounded-[5px] overflow-auto md:field-sizing-fixed resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-[5px]"
              onClick={() => onOpenChange(false)}
              disabled={isMutating}
            >
              Cancel
            </Button>
            <Button className="rounded-[5px]" onClick={handleSave} disabled={isMutating || !canSave}>
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </FocusLock>
      </DialogContent>
    </Dialog>
  );
}
