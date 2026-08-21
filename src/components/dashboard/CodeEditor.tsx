"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import { Check, Copy, Maximize2, Minimize2, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import VisuallyHidden from "@/components/VisuallyHidden/VisuallyHidden";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-[120px] bg-[#1e1e1e]" />,
});

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 400;
const EXPANDED_MIN_HEIGHT = 400;
const EXPANDED_MAX_HEIGHT = 600;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusAdjacentField(editor: Parameters<OnMount>[0], direction: 1 | -1) {
  const container = editor.getDomNode();
  if (!container) return;
  const root = container.closest<HTMLElement>('[role="dialog"]') ?? document.body;
  // Exclude anything inside the editor itself (Monaco has more than one internal
  // focusable node, so an index-based "step past the editor" can bounce between them
  // instead of escaping) and pick the true document-order neighbor instead.
  const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null && !container.contains(el)
  );
  if (focusable.length === 0) return;
  const target =
    direction === 1
      ? focusable.find((el) => container.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
      : [...focusable]
          .reverse()
          .find((el) => container.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
  (target ?? focusable[direction === 1 ? 0 : focusable.length - 1])?.focus();
}

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string | null;
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, language, readOnly = false }: CodeEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const minHeight = expanded ? EXPANDED_MIN_HEIGHT : MIN_HEIGHT;
  const maxHeight = expanded ? EXPANDED_MAX_HEIGHT : MAX_HEIGHT;

  // Height is applied imperatively (not via React state) so a resize never forces a
  // re-render of the controlled <Editor>: doing so mid-keystroke raced with Monaco's own
  // content sync and dropped characters during fast typing.
  const handleMount: OnMount = useCallback(
    (editor) => {
      const syncHeight = () => {
        const height = Math.min(maxHeight, Math.max(minHeight, editor.getContentHeight()));
        if (wrapperRef.current) wrapperRef.current.style.height = `${height}px`;
        editor.layout();
      };
      syncHeight();
      editor.onDidContentSizeChange(syncHeight);

      // Monaco swallows Tab for indentation by default, trapping keyboard focus inside the
      // editor. preventDefault alone doesn't stop it — Monaco's own Tab handling runs via a
      // listener on its inner edit-context node independently of the DOM "default action" —
      // so this also stops propagation on the capture phase at the container (an ancestor of
      // that inner node), keeping the event from ever reaching Monaco's handler at all. This
      // is a small form field, not an IDE, so Tab should behave like it did on the Textarea
      // it replaced: move focus to the next/previous field.
      const container = editor.getDomNode();
      const handleTabKeyDown = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        focusAdjacentField(editor, e.shiftKey ? -1 : 1);
      };
      container?.addEventListener("keydown", handleTabKeyDown, true);
    },
    [minHeight, maxHeight]
  );

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const editorPanel = (
    <div className="overflow-hidden rounded-lg border border-border bg-[#1e1e1e]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2.5">
          {language && <span className="text-xs text-neutral-400">{language}</span>}
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
            aria-label="Copy code"
            className="text-neutral-400 hover:text-neutral-200"
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
      </div>
      <div ref={wrapperRef} style={{ height: minHeight }}>
        <Editor
          height="100%"
          language={language?.toLowerCase() || "plaintext"}
          value={value}
          onChange={(v) => onChange?.(v ?? "")}
          onMount={handleMount}
          theme="vs-dark"
          options={{
            readOnly,
            domReadOnly: readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: readOnly ? "none" : "line",
            wordWrap: "on",
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </div>
  );

  if (!expanded) return editorPanel;

  return (
    <Dialog open onOpenChange={setExpanded}>
      <DialogContent className="rounded-[5px] p-7 sm:max-w-3xl" showCloseButton={false}>
        <VisuallyHidden>
          <DialogTitle>Content</DialogTitle>
        </VisuallyHidden>
        <DialogClose className="absolute top-[3px] right-[3px] inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        {editorPanel}
      </DialogContent>
    </Dialog>
  );
}
