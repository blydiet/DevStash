"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderOpen, Sparkles, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/dashboard/CodeEditor";
import { MarkdownEditor } from "@/components/dashboard/MarkdownEditor";
import { LanguageSelect } from "@/components/dashboard/LanguageSelect";
import { FileUpload } from "@/components/dashboard/FileUpload";
import { CollectionsMultiSelect } from "@/components/dashboard/CollectionsMultiSelect";
import {
  typeShowsCodeEditor,
  typeShowsContent,
  typeShowsFileUpload,
  typeShowsLanguage,
  typeShowsMarkdownEditor,
  typeShowsUrl,
} from "@/lib/item-type-capabilities";
import type { EditForm } from "@/lib/item-drawer-utils";
import type { ItemDetail } from "@/lib/db/items-queries";
import type { CollectionOption } from "@/lib/db/collections";
import { suggestTags } from "@/actions/ai";
import { mergeTagInput } from "@/lib/tag-input";

interface ItemDrawerEditFormProps {
  item: ItemDetail;
  form: EditForm;
  // Widened to accept a functional updater too — setForm is really
  // ItemDrawer.tsx's raw useState dispatcher (Dispatch<SetStateAction<EditForm
  // | null>>). Every existing call site here still passes a plain object;
  // handleSuggestTags below needs the updater form since it runs after an
  // await, where the `form` closure could otherwise be stale.
  setForm: (form: EditForm | ((prev: EditForm | null) => EditForm | null)) => void;
  collections: CollectionOption[];
  collectionsHaveError?: boolean;
}

export function ItemDrawerEditForm({
  item,
  form,
  setForm,
  collections,
  collectionsHaveError = false,
}: ItemDrawerEditFormProps) {
  const router = useRouter();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const showsContent = typeShowsContent(item.type.name);
  const showsLanguage = typeShowsLanguage(item.type.name);
  const showsUrl = typeShowsUrl(item.type.name);
  const showsCodeEditor = typeShowsCodeEditor(item.type.name);
  const showsMarkdownEditor = typeShowsMarkdownEditor(item.type.name);
  const showsFileUpload = typeShowsFileUpload(item.type.name);

  async function handleSuggestTags() {
    if (isSuggesting) return;

    setIsSuggesting(true);
    try {
      const result = await suggestTags(item.id);

      if (!result.success || !result.data) {
        toast.error(result.error ?? "AI tagging failed. Try again.", {
          action: result.upgradeRequired
            ? { label: "Upgrade", onClick: () => router.push("/upgrade?feature=ai") }
            : undefined,
        });
        return;
      }

      if (result.data.tags.length === 0) {
        toast.info("No new tags to suggest");
        return;
      }

      const suggested = result.data.tags;
      setForm((prev) => (prev ? { ...prev, tags: mergeTagInput(prev.tags, suggested) } : prev));
    } catch {
      toast.error("AI tagging failed. Try again.");
    } finally {
      setIsSuggesting(false);
    }
  }

  return (
    <>
      <div>
        <h3 className="pb-2 text-sm font-medium text-muted-foreground">Description</h3>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description"
        />
      </div>

      {showsLanguage && (
        <div>
          <h3 className="pb-2 text-sm font-medium text-muted-foreground">Language</h3>
          <LanguageSelect
            value={form.language}
            onChange={(language) => setForm({ ...form, language })}
          />
        </div>
      )}

      {showsContent && (
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
      )}

      {showsUrl && (
        <div>
          <h3 className="pb-2 text-sm font-medium text-muted-foreground">URL</h3>
          <Input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://example.com"
          />
        </div>
      )}

      {showsFileUpload && (
        <div>
          <h3 className="pb-2 text-sm font-medium text-muted-foreground">
            {item.type.name === "image" ? "Image" : "File"}
          </h3>
          <FileUpload
            kind={item.type.name as "file" | "image"}
            value={form.file}
            onChange={(file) => setForm({ ...form, file })}
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between pb-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Tag className="size-4" />
            Tags
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSuggesting}
            onClick={handleSuggestTags}
          >
            <Sparkles />
            {isSuggesting ? "Suggesting…" : "Suggest tags"}
          </Button>
        </div>
        <Input
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          placeholder="react, hooks, custom"
        />
      </div>

      <div>
        <h3 className="flex items-center gap-1.5 pb-2 text-sm font-medium text-muted-foreground">
          <FolderOpen className="size-4" />
          Collections
        </h3>
        <CollectionsMultiSelect
          collections={collections}
          selectedIds={form.collectionIds}
          onChange={(collectionIds) => setForm({ ...form, collectionIds })}
          hasError={collectionsHaveError}
        />
      </div>
    </>
  );
}
