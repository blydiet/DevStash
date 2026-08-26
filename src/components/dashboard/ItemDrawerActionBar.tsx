"use client";

import { Copy, Download, Pencil, Pin, Star, Trash2 } from "lucide-react";
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
import type { ItemDetail } from "@/lib/db/items";

interface ItemDrawerActionBarProps {
  item: ItemDetail;
  mode: "view" | "edit";
  isSaving: boolean;
  isDeleting: boolean;
  canSave: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
}

export function ItemDrawerActionBar({
  item,
  mode,
  isSaving,
  isDeleting,
  canSave,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: ItemDrawerActionBarProps) {
  if (mode === "edit") {
    return (
      <div className="flex items-center gap-1 border-b border-border p-4">
        <Button variant="ghost" size="sm" onClick={onCancelEdit} disabled={isSaving}>
          Cancel
        </Button>
        <Button size="sm" className="ml-auto" onClick={onSave} disabled={isSaving || !canSave}>
          Save
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 border-b border-border p-4">
      <Button variant="ghost" size="sm" className={item.isFavorite ? "text-yellow-500" : ""}>
        <Star className={item.isFavorite ? "fill-yellow-500" : ""} />
        <span className="hidden sm:inline">Favorite</span>
      </Button>
      <Button variant="ghost" size="sm">
        <Pin />
        <span className="hidden sm:inline">Pin</span>
      </Button>
      <Button variant="ghost" size="sm">
        <Copy />
        <span className="hidden sm:inline">Copy</span>
      </Button>
      {item.contentType === "file" && item.fileUrl && (
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<a href={`/api/items/${item.id}/download`} />}
        >
          <Download />
          <span className="hidden sm:inline">Download</span>
        </Button>
      )}
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onStartEdit}>
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
              aria-label="Delete item"
            />
          }
        >
          <Trash2 />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes &ldquo;{item.title}&rdquo;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={isDeleting} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
