"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Maximize2, Minimize2, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import VisuallyHidden from "@/components/VisuallyHidden/VisuallyHidden";

const MIN_HEIGHT = 136;
const MAX_HEIGHT = 400;
const EXPANDED_MIN_HEIGHT = 400;
const EXPANDED_MAX_HEIGHT = 500;

interface MarkdownEditorProps {
  id?: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export function MarkdownEditor({ id, value, onChange, readOnly = false }: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">(readOnly ? "preview" : "write");
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const minHeight = expanded ? EXPANDED_MIN_HEIGHT : MIN_HEIGHT;
  const maxHeight = expanded ? EXPANDED_MAX_HEIGHT : MAX_HEIGHT;

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const editorPanel = (
    <div className="overflow-hidden rounded-lg border border-border bg-[#1e1e1e]">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "write" | "preview")}>
        <div className="flex items-center justify-between border-b border-white/10 bg-[#2d2d2d] px-3 py-2">
          {readOnly ? (
            <TabsList variant="line">
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          ) : (
            <TabsList variant="line">
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          )}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setExpanded((prev) => !prev)}
              aria-label={expanded ? "Collapse editor" : "Expand editor"}
              className="text-neutral-400 hover:text-neutral-200"
            >
              {expanded ? <Minimize2 /> : <Maximize2 />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleCopy}
              aria-label="Copy content"
              className="text-neutral-400 hover:text-neutral-200"
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        </div>

        {!readOnly && (
          <TabsContent value="write" className="m-0">
            <textarea
              id={id}
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder="Write markdown..."
              style={{ minHeight, maxHeight }}
              className="field-sizing-content block w-full resize-none bg-[#1e1e1e] px-3 py-2.5 font-mono text-xs text-neutral-200 outline-none placeholder:text-neutral-500"
            />
          </TabsContent>
        )}

        <TabsContent
          value="preview"
          className="m-0 overflow-y-auto px-3 py-2.5"
          style={{ minHeight, maxHeight  }}
        >
          {value.trim() === "" ? (
            <p className="text-xs text-neutral-500">Nothing to preview.</p>
          ) : (
            <div className="markdown-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  if (!expanded) return editorPanel;

  return (
    <Dialog open onOpenChange={setExpanded}>
      <DialogContent
        className="gap-0 overflow-hidden rounded-lg bg-transparent p-0 ring-0 sm:max-w-3xl"
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>Content</DialogTitle>
        </VisuallyHidden>
        {editorPanel}
      </DialogContent>
    </Dialog>
  );
}
