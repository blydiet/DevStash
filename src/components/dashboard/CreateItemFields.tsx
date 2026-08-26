"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CodeEditor } from "@/components/dashboard/CodeEditor";
import { MarkdownEditor } from "@/components/dashboard/MarkdownEditor";
import { FileUpload, type UploadedFile } from "@/components/dashboard/FileUpload";
import {
  typeShowsCodeEditor,
  typeShowsContent,
  typeShowsFileUpload,
  typeShowsMarkdownEditor,
  typeShowsUrl,
} from "@/lib/item-type-capabilities";
import type { ItemType } from "@/lib/item-types";

export interface CreateItemFormState {
  type: ItemType;
  title: string;
  description: string;
  content: string;
  url: string;
  language: string;
  file: UploadedFile | null;
  tags: string;
}

interface CreateItemFieldsProps {
  form: CreateItemFormState;
  setForm: (form: CreateItemFormState) => void;
}

export function CreateItemFields({ form, setForm }: CreateItemFieldsProps) {
  const showsUrl = typeShowsUrl(form.type);
  const showsContent = typeShowsContent(form.type);
  const showsCodeEditor = typeShowsCodeEditor(form.type);
  const showsMarkdownEditor = typeShowsMarkdownEditor(form.type);
  const showsFileUpload = typeShowsFileUpload(form.type);

  return (
    <div className="flex flex-col gap-4">
      {showsUrl && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="item-url">URL</Label>
          <Input
            id="item-url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://example.com"
            className="rounded-[5px]"
          />
        </div>
      )}

      {showsContent && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="item-content">Content</Label>
          {showsCodeEditor ? (
            <CodeEditor
              value={form.content}
              onChange={(value) => setForm({ ...form, content: value })}
              language={form.language}
            />
          ) : showsMarkdownEditor ? (
            <MarkdownEditor
              id="item-content"
              value={form.content}
              onChange={(value) => setForm({ ...form, content: value })}
            />
          ) : null}
        </div>
      )}

      {showsFileUpload && (
        <div className="flex flex-col gap-1.5">
          <Label>{form.type === "image" ? "Image" : "File"}</Label>
          <FileUpload
            kind={form.type as "file" | "image"}
            value={form.file}
            onChange={(file) => setForm({ ...form, file })}
          />
        </div>
      )}
    </div>
  );
}
