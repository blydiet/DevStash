"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import type { CreateCollectionResponse } from "@/types/collections";

const EMPTY_FORM = { name: "", description: "" };

export function CreateCollectionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setForm(EMPTY_FORM);
    }
    onOpenChange(nextOpen);
  }

  async function handleCreate() {
    setIsSaving(true);

    let response: Response;
    try {
      response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description.trim() === "" ? null : form.description,
        }),
      });
    } catch {
      setIsSaving(false);
      toast.error("Failed to create collection");
      return;
    }

    if (response.status === 401) {
      setIsSaving(false);
      const signInUrl = new URL("/sign-in", window.location.origin);
      signInUrl.searchParams.set("callbackUrl", window.location.href);
      toast.error("Your session has expired. Please sign in again.");
      router.push(`${signInUrl.pathname}${signInUrl.search}`);
      return;
    }

    const result: CreateCollectionResponse = await response
      .json()
      .catch(() => ({ success: false, error: "Failed to create collection" }));

    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to create collection");
      return;
    }

    toast.success("Collection created");
    handleOpenChange(false);
    router.refresh();
  }

  const canSave = form.name.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[5px]" showCloseButton={false}>
        <FocusLock returnFocus className="contents">
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
          </DialogHeader>
          <DialogClose className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="collection-name">Name</Label>
              <Input
                id="collection-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Name"
                className="rounded-[5px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="collection-description">Description</Label>
              <Textarea
                id="collection-description"
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
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button className="rounded-[5px]" onClick={handleCreate} disabled={isSaving || !canSave}>
              Create
            </Button>
          </DialogFooter>
        </FocusLock>
      </DialogContent>
    </Dialog>
  );
}
