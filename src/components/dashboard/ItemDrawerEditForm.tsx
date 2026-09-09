"use client";

import { FolderOpen, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface ItemDrawerEditFormProps {
  item: ItemDetail;
  form: EditForm;
  setForm: (form: EditForm) => void;
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
  const showsContent = typeShowsContent(item.type.name);
  const showsLanguage = typeShowsLanguage(item.type.name);
  const showsUrl = typeShowsUrl(item.type.name);
  const showsCodeEditor = typeShowsCodeEditor(item.type.name);
  const showsMarkdownEditor = typeShowsMarkdownEditor(item.type.name);
  const showsFileUpload = typeShowsFileUpload(item.type.name);

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
