"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWRMutation from "swr/mutation";
import FocusLock from "react-focus-lock";
import { XIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCollectionMutation } from "@/lib/swr-fetcher";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";

interface EditCollectionDialogProps {
  collection: { id: string; name: string; description: string | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCollectionDialog({ collection, open, onOpenChange }: EditCollectionDialogProps) {
  const router = useRouter();
  const handleApiError = useApiErrorToast();
  const [form, setForm] = useState({ name: collection.name, description: collection.description ?? "" });
  const { trigger, isMutating } = useSWRMutation(
    `/api/collections/${collection.id}`,
    updateCollectionMutation,
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setForm({ name: collection.name, description: collection.description ?? "" });
    }
    onOpenChange(nextOpen);
  }

  async function handleSave() {
    try {
      await trigger({
        name: form.name,
        description: form.description.trim() === "" ? null : form.description,
      });
    } catch (err) {
      handleApiError(err, "Failed to update collection");
      return;
    }

    toast.success("Collection updated");
    handleOpenChange(false);
    router.refresh();
  }

  const canSave = form.name.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[5px]" showCloseButton={false}>
        <FocusLock returnFocus className="contents">
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <DialogClose className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-collection-name">Name</Label>
              <Input
                id="edit-collection-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Name"
                className="rounded-[5px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-collection-description">Description</Label>
              <Textarea
                id="edit-collection-description"
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
              onClick={() => handleOpenChange(false)}
              disabled={isMutating}
            >
              Cancel
            </Button>
            <Button className="rounded-[5px]" onClick={handleSave} disabled={isMutating || !canSave}>
              Save
            </Button>
          </DialogFooter>
        </FocusLock>
      </DialogContent>
    </Dialog>
  );
}
