"use client";

import { Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CodeEditor } from "@/components/dashboard/CodeEditor";
import { MarkdownEditor } from "@/components/dashboard/MarkdownEditor";
import {
  typeShowsCodeEditor,
  typeShowsContent,
  typeShowsLanguage,
  typeShowsMarkdownEditor,
  typeShowsUrl,
} from "@/lib/item-type-capabilities";
import type { EditForm } from "@/lib/item-drawer-utils";
import type { ItemDetail } from "@/lib/db/items-queries";

interface ItemDrawerEditFormProps {
  item: ItemDetail;
  form: EditForm;
  setForm: (form: EditForm) => void;
}

export function ItemDrawerEditForm({ item, form, setForm }: ItemDrawerEditFormProps) {
  const showsContent = typeShowsContent(item.type.name);
  const showsLanguage = typeShowsLanguage(item.type.name);
  const showsUrl = typeShowsUrl(item.type.name);
  const showsCodeEditor = typeShowsCodeEditor(item.type.name);
  const showsMarkdownEditor = typeShowsMarkdownEditor(item.type.name);

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

      {showsLanguage && (
        <div>
          <h3 className="pb-2 text-sm font-medium text-muted-foreground">Language</h3>
          <Input
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value })}
            placeholder="e.g. typescript"
          />
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
    </>
  );
}
