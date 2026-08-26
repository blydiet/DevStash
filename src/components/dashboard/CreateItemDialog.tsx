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
import { ItemTypeSelect } from "@/components/dashboard/ItemTypeSelect";
import { CreateItemFields, type CreateItemFormState } from "@/components/dashboard/CreateItemFields";
import { createItem } from "@/actions/items";
import {
  typeShowsContent,
  typeShowsFileUpload,
  typeShowsLanguage,
  typeShowsUrl,
} from "@/lib/item-type-capabilities";
import { cn } from "@/lib/utils";
import type { ItemType } from "@/lib/item-types";

const EMPTY_FORM: CreateItemFormState = {
  type: "snippet",
  title: "",
  description: "",
  content: "",
  url: "",
  language: "",
  file: null,
  tags: "",
};

export function CreateItemDialog({
  open,
  onOpenChange,
  defaultType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: ItemType;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CreateItemFormState>(() => ({
    ...EMPTY_FORM,
    type: defaultType ?? EMPTY_FORM.type,
  }));
  const [isSaving, setIsSaving] = useState(false);

  const showsLanguage = typeShowsLanguage(form.type);
  const showsUrl = typeShowsUrl(form.type);
  const showsContent = typeShowsContent(form.type);
  const showsFileUpload = typeShowsFileUpload(form.type);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setForm({ ...EMPTY_FORM, type: defaultType ?? EMPTY_FORM.type });
    }
    onOpenChange(nextOpen);
  }

  async function handleCreate() {
    setIsSaving(true);
    const result = await createItem({
      type: form.type,
      title: form.title,
      description: form.description.trim() === "" ? null : form.description,
      content: showsContent && form.content.trim() !== "" ? form.content : null,
      url: showsUrl && form.url.trim() !== "" ? form.url : null,
      language: showsLanguage && form.language.trim() !== "" ? form.language : null,
      fileUrl: showsFileUpload ? (form.file?.fileUrl ?? null) : null,
      fileName: showsFileUpload ? (form.file?.fileName ?? null) : null,
      fileSize: showsFileUpload ? (form.file?.fileSize ?? null) : null,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to create item");
      return;
    }

    toast.success("Item created");
    handleOpenChange(false);
    router.refresh();
  }

  const canSave =
    form.title.trim() !== "" &&
    (!showsUrl || form.url.trim() !== "") &&
    (!showsFileUpload || form.file !== null);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-[5px]" showCloseButton={false}>
        <FocusLock returnFocus className="contents">
          <DialogHeader>
            <DialogTitle>New Item</DialogTitle>
          </DialogHeader>
          <DialogClose className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <div className="flex flex-col gap-4">
                <ItemTypeSelect value={form.type} onChange={(type) => setForm({ ...form, type })} />

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="item-title">Title</Label>
                  <Input
                    id="item-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Title"
                    className="rounded-[5px]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="item-description">Description</Label>
                  <Textarea
                    id="item-description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Description"
                    className="rounded-[5px] overflow-auto md:field-sizing-fixed resize-none"
                  />
                </div>
              </div>

              <CreateItemFields form={form} setForm={setForm} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              {showsLanguage && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="item-language">Language</Label>
                  <Input
                    id="item-language"
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    placeholder="e.g. typescript"
                    className="rounded-[5px]"
                  />
                </div>
              )}

              <div className={cn("flex flex-col gap-1.5", !showsLanguage && "sm:col-span-2")}>
                <Label htmlFor="item-tags">Tags</Label>
                <Input
                  id="item-tags"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="react, hooks, custom"
                  className="rounded-[5px]"
                />
              </div>
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
