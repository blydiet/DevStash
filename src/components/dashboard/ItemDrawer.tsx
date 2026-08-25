"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { Calendar, Copy, Download, File, FolderOpen, Pencil, Pin, Star, Tag, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeEditor } from "@/components/dashboard/CodeEditor";
import { MarkdownEditor } from "@/components/dashboard/MarkdownEditor";
import { iconMap } from "@/lib/icon-map";
import { formatFileSize } from "@/lib/file-constraints";
import { fetchItemDetail } from "@/lib/swr-fetcher";
import { deleteItem, updateItem } from "@/actions/items";
import type { ItemDetail } from "@/lib/db/items";

const TYPES_WITH_CONTENT = ["snippet", "prompt", "command", "note"];
const TYPES_WITH_LANGUAGE = ["snippet", "command"];
const TYPES_WITH_URL = ["link"];
const TYPES_WITH_CODE_EDITOR = ["snippet", "command"];
const TYPES_WITH_MARKDOWN_EDITOR = ["prompt", "note"];

interface EditForm {
  title: string;
  description: string;
  content: string;
  url: string;
  language: string;
  tags: string;
}

function toEditForm(item: ItemDetail): EditForm {
  return {
    title: item.title,
    description: item.description ?? "",
    content: item.content ?? "",
    url: item.url ?? "",
    language: item.language ?? "",
    tags: item.tags.join(", "),
  };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ItemDrawerSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-6 w-40" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

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

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState<EditForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetKey = open ? itemId : null;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setMode("view");
    setForm(null);
  }

  const Icon = item ? (iconMap[item.type.icon ?? ""] ?? File) : File;
  const showsContent = item ? TYPES_WITH_CONTENT.includes(item.type.name) : false;
  const showsLanguage = item ? TYPES_WITH_LANGUAGE.includes(item.type.name) : false;
  const showsUrl = item ? TYPES_WITH_URL.includes(item.type.name) : false;
  const showsCodeEditor = item ? TYPES_WITH_CODE_EDITOR.includes(item.type.name) : false;
  const showsMarkdownEditor = item ? TYPES_WITH_MARKDOWN_EDITOR.includes(item.type.name) : false;

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
    const result = await updateItem(item.id, {
      title: form.title,
      description: form.description.trim() === "" ? null : form.description,
      content: showsContent && form.content.trim() !== "" ? form.content : null,
      url: showsUrl && form.url.trim() !== "" ? form.url : null,
      language: showsLanguage && form.language.trim() !== "" ? form.language : null,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setIsSaving(false);

    if (!result.success || !result.data) {
      toast.error(result.error ?? "Failed to update item");
      return;
    }

    mutate(result.data, { revalidate: false });
    setMode("view");
    setForm(null);
    toast.success("Item updated");
    router.refresh();
  }

  async function handleDelete() {
    if (!item) return;

    setIsDeleting(true);
    const result = await deleteItem(item.id);
    setIsDeleting(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to delete item");
      return;
    }

    onOpenChange(false);
    toast.success("Item deleted");
    router.refresh();
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

            <div className="flex items-center gap-1 border-b border-border p-4">
              {mode === "view" ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={item.isFavorite ? "text-yellow-500" : ""}
                  >
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
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={startEdit}>
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
                          This permanently deletes &ldquo;{item.title}&rdquo;. This action cannot
                          be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={isDeleting}
                          variant="destructive"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="ml-auto"
                    onClick={saveEdit}
                    disabled={isSaving || !form?.title.trim()}
                  >
                    Save
                  </Button>
                </>
              )}
            </div>

            <div className="flex flex-col gap-6 p-6">
              {mode === "edit" && form ? (
                <div>
                  <h3 className="pb-2 text-sm font-medium text-muted-foreground">Description</h3>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Description"
                    
                  />
                </div>
              ) : (
                item.description && (
                  <div>
                    <h3 className="pb-2 text-sm font-medium text-muted-foreground">
                      Description
                    </h3>
                    <p className="text-sm">{item.description}</p>
                  </div>
                )
              )}

              {mode === "edit" && form
                ? showsContent && (
                    <div>
                      <h3 className="pb-2 text-sm font-medium text-muted-foreground">Content</h3>
                      {showsCodeEditor ? (
                        <CodeEditor
                          value={form.content}
                          onChange={(value) => setForm({ ...form, content: value })}
                          language={form.language}
                        />
                      ) : showsMarkdownEditor ? (
                        <MarkdownEditor
                          key="edit"
                          value={form.content}
                          onChange={(value) => setForm({ ...form, content: value })}
                        />
                      ) : null}
                    </div>
                  )
                : item.content && (
                    <div>
                      <h3 className="pb-2 text-sm font-medium text-muted-foreground">Content</h3>
                      {showsCodeEditor ? (
                        <CodeEditor value={item.content} language={item.language} readOnly />
                      ) : showsMarkdownEditor ? (
                        <MarkdownEditor key="view" value={item.content} readOnly />
                      ) : null}
                    </div>
                  )}

              {mode === "edit" && form
                ? showsLanguage && (
                    <div>
                      <h3 className="pb-2 text-sm font-medium text-muted-foreground">Language</h3>
                      <Input
                        value={form.language}
                        onChange={(e) => setForm({ ...form, language: e.target.value })}
                        placeholder="e.g. typescript"
                      />
                    </div>
                  )
                : null}

              {mode === "edit" && form
                ? showsUrl && (
                    <div>
                      <h3 className="pb-2 text-sm font-medium text-muted-foreground">URL</h3>
                      <Input
                        value={form.url}
                        onChange={(e) => setForm({ ...form, url: e.target.value })}
                        placeholder="https://example.com"
                      />
                    </div>
                  )
                : item.url && (
                    <div>
                      <h3 className="pb-2 text-sm font-medium text-muted-foreground">URL</h3>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-sm text-primary underline underline-offset-4"
                      >
                        {item.url}
                      </a>
                    </div>
                  )}

              {mode === "view" && item.type.name === "image" && item.fileUrl && (
                <div>
                  <h3 className="pb-2 text-sm font-medium text-muted-foreground">Preview</h3>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.fileUrl}
                    alt={item.fileName ?? item.title}
                    className="max-h-64 w-full rounded-[5px] object-contain"
                  />
                </div>
              )}

              {mode === "view" && item.type.name === "file" && item.fileName && (
                <div>
                  <h3 className="pb-2 text-sm font-medium text-muted-foreground">File</h3>
                  <div className="flex items-center gap-3 rounded-[5px] border border-border p-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                      <File className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{item.fileName}</span>
                      {item.fileSize !== null && (
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(item.fileSize)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {mode === "edit" && form ? (
                <div>
                  <h3 className="flex items-center gap-1.5 pb-2 text-sm font-medium text-muted-foreground">
                    <Tag className="size-4" />
                    Tags
                  </h3>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="react, hooks, custom"
                  />
                </div>
              ) : (
                item.tags.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-1.5 pb-2 text-sm font-medium text-muted-foreground">
                      <Tag className="size-4" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )
              )}

              {item.collection && (
                <div>
                  <h3 className="flex items-center gap-1.5 pb-2 text-sm font-medium text-muted-foreground">
                    <FolderOpen className="size-4" />
                    Collections
                  </h3>
                  <Badge variant="secondary">{item.collection.name}</Badge>
                </div>
              )}

              <div>
                <h3 className="flex items-center gap-1.5 pb-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="size-4" />
                  Details
                </h3>
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{formatDate(item.createdAt as unknown as string)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Updated</span>
                    <span>{formatDate(item.updatedAt as unknown as string)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
