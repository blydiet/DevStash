"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Check, Copy, Crown, Loader2, Maximize2, Minimize2, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import VisuallyHidden from "@/components/VisuallyHidden/VisuallyHidden";
import { optimizePrompt } from "@/actions/ai";
import { cn } from "@/lib/utils";

const MIN_HEIGHT = 136;
const MAX_HEIGHT = 400;
const EXPANDED_MIN_HEIGHT = 400;
const EXPANDED_MAX_HEIGHT = 500;

interface MarkdownEditorProps {
  id?: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  // Only set from ItemDrawerViewContent for Prompt items — Optimize is
  // scoped to already-saved prompts in the drawer's read view, never the
  // create/edit forms, matching CodeEditor's itemId/isPro convention for
  // Explain. onApply persists the optimized text via the caller's own
  // updateItem call (this component never writes to the DB) and resolves
  // to whether the save actually succeeded, so a failure leaves the
  // suggestion on screen for the user to retry rather than silently
  // discarding it.
  itemId?: string;
  isPro?: boolean;
  onApply?: (newContent: string) => Promise<boolean>;
  // Opt-in only (CreateItemFields, for Prompt/Note): stretches this editor
  // to bottom-align with the sibling Description field on desktop/tablet.
  // Must stay opt-in rather than an always-on responsive class — giving
  // Tabs a bare `flex-1` (flex-basis: 0%) turns out to inflate this
  // component's own auto-height even with no stretched ancestor providing
  // a definite height to fill (a real flexbox auto-sizing quirk, confirmed
  // live: it puffed up the read-only drawer view's normally-compact
  // ~150px box to ~220px with only one line of content). Scoping it to a
  // prop keeps every other caller (the drawer's view/edit modes) on the
  // original content-driven sizing.
  fill?: boolean;
}

export function MarkdownEditor({
  id,
  value,
  onChange,
  readOnly = false,
  itemId,
  isPro,
  onApply,
  fill = false,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview" | "optimized">(readOnly ? "preview" : "write");
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [optimizedContent, setOptimizedContent] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const mountedRef = useRef(true);

  // Guards against a stale in-flight optimizePrompt/onApply response landing
  // after this instance unmounts — mirrors CodeEditor's identical guard for
  // Explain, reachable the same way (ItemDrawerProvider.openItem() can
  // switch to a different item's id while the drawer stays open).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const minHeight = expanded ? EXPANDED_MIN_HEIGHT : MIN_HEIGHT;
  const maxHeight = expanded ? EXPANDED_MAX_HEIGHT : MAX_HEIGHT;

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleOptimize() {
    if (!itemId || isOptimizing) return;

    setIsOptimizing(true);
    try {
      const result = await optimizePrompt(itemId);
      if (!mountedRef.current) return;

      if (!result.success || !result.data) {
        toast.error(result.error ?? "AI optimization failed. Try again.");
        return;
      }

      setOptimizedContent(result.data.optimizedContent);
      setTab("optimized");
    } catch {
      if (mountedRef.current) {
        toast.error("AI optimization failed. Try again.");
      }
    } finally {
      if (mountedRef.current) {
        setIsOptimizing(false);
      }
    }
  }

  function handleKeepOriginal() {
    setOptimizedContent(null);
    setTab("preview");
  }

  // onApply (ItemDrawer's handleApplyOptimizedPrompt) already surfaces its
  // own success/error toast via updateItem's established convention for a
  // save that fails cleanly (resolves to false) — this only needs to know
  // whether to clear the suggestion or leave it visible for a retry. The
  // catch below is for the separate, genuinely unexpected case of onApply
  // itself throwing rather than resolving.
  async function handleUseOptimized() {
    if (!optimizedContent || !onApply || isApplying) return;

    setIsApplying(true);
    try {
      const applied = await onApply(optimizedContent);
      if (applied && mountedRef.current) {
        setOptimizedContent(null);
        setTab("preview");
      }
    } catch {
      if (mountedRef.current) {
        toast.error("Failed to update item");
      }
    } finally {
      if (mountedRef.current) {
        setIsApplying(false);
      }
    }
  }

  const editorPanel = (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-[#1e1e1e]",
        fill && "sm:flex sm:h-full sm:flex-col"
      )}
    >
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "write" | "preview" | "optimized")}
        className={cn(fill && "sm:min-h-0 sm:flex-1")}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-[#2d2d2d] px-3 py-2">
          {readOnly ? (
            <TabsList variant="line">
              <TabsTrigger value="preview">{optimizedContent !== null ? "Original" : "Preview"}</TabsTrigger>
              {optimizedContent !== null && <TabsTrigger value="optimized">Optimized</TabsTrigger>}
            </TabsList>
          ) : (
            <TabsList variant="line">
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          )}
          <div className="flex items-center gap-1">
            {itemId &&
              (isPro ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                  aria-label={isOptimizing ? "Optimizing prompt…" : "Optimize prompt"}
                  className="text-neutral-400 hover:text-neutral-200"
                >
                  {isOptimizing ? <Loader2 className="animate-spin" /> : <Sparkles />}
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    aria-disabled="true"
                    aria-label="Optimize prompt — AI features require Pro subscription"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon-xs" }),
                      "cursor-not-allowed text-neutral-500 hover:bg-transparent hover:text-neutral-500"
                    )}
                  >
                    <Crown />
                  </TooltipTrigger>
                  <TooltipContent>AI features require Pro subscription</TooltipContent>
                </Tooltip>
              ))}
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
              className={cn(
                "field-sizing-content block w-full resize-none bg-[#1e1e1e] px-3 py-2.5 font-mono text-base text-neutral-200 outline-none placeholder:text-neutral-500",
                fill && "sm:h-full sm:field-sizing-fixed"
              )}
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

        {optimizedContent !== null && (
          <TabsContent
            value="optimized"
            className="m-0 overflow-y-auto px-3 py-2.5"
            style={{ minHeight, maxHeight }}
          >
            <div className="markdown-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{optimizedContent}</ReactMarkdown>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {optimizedContent !== null && (
        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-[#2d2d2d] px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleKeepOriginal}
            disabled={isApplying}
            className="text-neutral-300 hover:text-neutral-100"
          >
            Keep original
          </Button>
          <Button type="button" size="sm" onClick={handleUseOptimized} disabled={isApplying}>
            {isApplying && <Loader2 className="size-3.5 animate-spin" />}
            Use this prompt
          </Button>
        </div>
      )}
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
