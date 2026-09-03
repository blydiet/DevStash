"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { File } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { iconMap } from "@/lib/icon-map";
import { fetchCollectionOptions, fetchItemDetail } from "@/lib/swr-fetcher";
import { deleteItem, toggleItemFavorite, updateItem } from "@/actions/items";
import { typeShowsContent, typeShowsLanguage, typeShowsUrl } from "@/lib/item-type-capabilities";
import { toEditForm, type EditForm } from "@/lib/item-drawer-utils";
import { ItemDrawerSkeleton } from "@/components/dashboard/ItemDrawerSkeleton";
import { ItemDrawerActionBar } from "@/components/dashboard/ItemDrawerActionBar";
import { ItemDrawerViewContent } from "@/components/dashboard/ItemDrawerViewContent";
import { ItemDrawerEditForm } from "@/components/dashboard/ItemDrawerEditForm";
import { ItemDrawerMetadata } from "@/components/dashboard/ItemDrawerMetadata";

export function ItemDrawer({
  itemId,
  open,
  onOpenChange,
}: {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const {
    data: item,
    error,
    isLoading,
    mutate,
  } = useSWR(open && itemId ? `/api/items/${itemId}` : null, fetchItemDetail);
  const { data: collections = [], error: collectionsError } = useSWR(
    open ? "/api/collections" : null,
    fetchCollectionOptions
  );

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState<EditForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const resetKey = open ? itemId : null;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setMode("view");
    setForm(null);
  }

  const Icon = item ? (iconMap[item.type.icon ?? ""] ?? File) : File;

  function startEdit() {
    if (!item) return;
    setForm(toEditForm(item));
    setMode("edit");
  }

  function cancelEdit() {
    setMode("view");
    setForm(null);
  }

  async function saveEdit() {
    if (!item || !form) return;

    setIsSaving(true);
    try {
      const result = await updateItem(item.id, {
        title: form.title,
        description: form.description.trim() === "" ? null : form.description,
        content: typeShowsContent(item.type.name) && form.content.trim() !== "" ? form.content : null,
        url: typeShowsUrl(item.type.name) && form.url.trim() !== "" ? form.url : null,
        language:
          typeShowsLanguage(item.type.name) && form.language.trim() !== "" ? form.language : null,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        collectionIds: form.collectionIds,
      });

      if (!result.success || !result.data) {
        toast.error(result.error ?? "Failed to update item");
        return;
      }

      mutate(result.data, { revalidate: false });
      setMode("view");
      setForm(null);
      toast.success("Item updated");
      router.refresh();
    } catch {
      toast.error("Failed to update item");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;

    setIsDeleting(true);
    try {
      const result = await deleteItem(item.id);

      if (!result.success) {
        toast.error(result.error ?? "Failed to delete item");
        return;
      }

      onOpenChange(false);
      toast.success("Item deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleToggleFavorite() {
    if (!item || isTogglingFavorite) return;

    const previous = item;
    const next = !item.isFavorite;
    mutate({ ...item, isFavorite: next }, { revalidate: false });

    setIsTogglingFavorite(true);
    try {
      const result = await toggleItemFavorite(item.id, next);

      if (!result.success || !result.data) {
        mutate(previous, { revalidate: false });
        toast.error(result.error ?? "Failed to update favorite");
        return;
      }

      mutate(result.data, { revalidate: false });
      router.refresh();
    } catch {
      mutate(previous, { revalidate: false });
      toast.error("Failed to update favorite");
    } finally {
      setIsTogglingFavorite(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        {isLoading && <ItemDrawerSkeleton />}

        {!isLoading && error && (
          <p className="p-6 text-sm text-destructive">
            Failed to load item: {error instanceof Error ? error.message : "Unknown error"}
          </p>
        )}

        {!isLoading && !error && item && (
          <>
            <SheetHeader className="gap-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${item.type.color}1a` }}
                >
                  <Icon className="size-5" style={{ color: item.type.color ?? undefined }} />
                </div>
                {mode === "edit" && form ? (
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Title"
                    className="flex-1"
                  />
                ) : (
                  <SheetTitle className="pr-8">{item.title}</SheetTitle>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{item.type.name}</Badge>
                {item.language && <Badge variant="secondary">{item.language}</Badge>}
              </div>
            </SheetHeader>

            <ItemDrawerActionBar
              item={item}
              mode={mode}
              isSaving={isSaving}
              isDeleting={isDeleting}
              isTogglingFavorite={isTogglingFavorite}
              canSave={Boolean(form?.title.trim())}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              onSave={saveEdit}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
            />

            <div className="flex flex-col gap-6 p-6">
              {mode === "edit" && form ? (
                <ItemDrawerEditForm
                  item={item}
                  form={form}
                  setForm={setForm}
                  collections={collections}
                  collectionsHaveError={Boolean(collectionsError)}
                />
              ) : (
                <ItemDrawerViewContent item={item} />
              )}
              <ItemDrawerMetadata item={item} showCollections={mode !== "edit"} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
