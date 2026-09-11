"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { BeforeMount, Monaco, OnMount } from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Check, Copy, Crown, Loader2, Maximize2, Minimize2, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import VisuallyHidden from "@/components/VisuallyHidden/VisuallyHidden";
import { useEditorPreferences } from "@/components/dashboard/EditorPreferencesContext";
import { explainCode } from "@/actions/ai";
import { cn } from "@/lib/utils";

// Monaco only ships "vs" / "vs-dark" / "hc-black" out of the box — "monokai" and
// "github-dark" are approximations of the well-known palettes, registered here since
// there's no built-in equivalent to reference.
const CUSTOM_THEMES: Record<string, Parameters<Monaco["editor"]["defineTheme"]>[1]> = {
  monokai: {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "75715E", fontStyle: "italic" },
      { token: "keyword", foreground: "F92672" },
      { token: "string", foreground: "E6DB74" },
      { token: "number", foreground: "AE81FF" },
      { token: "type", foreground: "66D9EF" },
      { token: "function", foreground: "A6E22E" },
      { token: "variable", foreground: "F8F8F2" },
    ],
    colors: {
      "editor.background": "#272822",
      "editor.foreground": "#F8F8F2",
      "editorLineNumber.foreground": "#75715E",
      "editor.selectionBackground": "#49483E",
      "editor.lineHighlightBackground": "#3E3D32",
    },
  },
  "github-dark": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8B949E", fontStyle: "italic" },
      { token: "keyword", foreground: "FF7B72" },
      { token: "string", foreground: "A5D6FF" },
      { token: "number", foreground: "79C0FF" },
      { token: "type", foreground: "FFA657" },
      { token: "function", foreground: "D2A8FF" },
      { token: "variable", foreground: "C9D1D9" },
    ],
    colors: {
      "editor.background": "#0D1117",
      "editor.foreground": "#C9D1D9",
      "editorLineNumber.foreground": "#8B949E",
      "editor.selectionBackground": "#264F78",
      "editor.lineHighlightBackground": "#161B22",
    },
  },
};

const handleBeforeMount: BeforeMount = (monaco) => {
  for (const [name, theme] of Object.entries(CUSTOM_THEMES)) {
    monaco.editor.defineTheme(name, theme);
  }
};

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-[120px] bg-[#1e1e1e]" />,
});

const MIN_HEIGHT = 157;
const MIN_HEIGHT_MOBILE = 120;
const MAX_HEIGHT = 400;
const EXPANDED_MIN_HEIGHT = 400;
const EXPANDED_MAX_HEIGHT = 500;
// Matches Tailwind's `sm` breakpoint, used elsewhere in this codebase for
// the same mobile/desktop split (e.g. CreateItemDialog's two-column grid).
const MOBILE_MAX_WIDTH = 640;

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
  // Only set from the item drawer's read view (ItemDrawerViewContent) — the
  // Explain feature is scoped to already-saved snippet/command items, never
  // the create/edit forms, so CodeEditor renders no Explain UI at all
  // unless a caller opts in by passing this.
  itemId?: string;
  isPro?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  itemId,
  isPro,
}: CodeEditorProps) {
  const { preferences } = useEditorPreferences();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "explain">("code");
  const mountedRef = useRef(true);

  // Guards against a stale in-flight explainCode response landing after this
  // instance unmounts — reachable since ItemDrawerProvider.openItem() can
  // switch to a different item's id while the drawer stays open, and this
  // component itself is remounted via key={item.id} at that point (not
  // simply left mounted with new props), so an in-flight request from the
  // previous item's instance must not call setState/toast after that.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const minHeight = expanded ? EXPANDED_MIN_HEIGHT : MIN_HEIGHT;
  const maxHeight = expanded ? EXPANDED_MAX_HEIGHT : MAX_HEIGHT;

  // The collapsed/expanded wrapper can be hidden (display:none) while the
  // Explain tab is active, which leaves Monaco's last layout stale for its
  // now-visible-again container next time the Code tab is selected.
  useEffect(() => {
    if (activeTab === "code") {
      requestAnimationFrame(() => editorRef.current?.layout());
    }
  }, [activeTab]);

  // A re-click while an explanation already exists (regenerate) doesn't
  // clear the stale one — the Explain tab's render below gates on
  // isExplaining to show a loading state instead of silently leaving the
  // old explanation on screen mid-request, rather than clearing state here
  // and risking a flash-to-empty if the caller is already sitting on that
  // tab when the click happens.
  async function handleExplain() {
    if (!itemId || isExplaining) return;

    setIsExplaining(true);
    try {
      const result = await explainCode(itemId);
      if (!mountedRef.current) return;

      if (!result.success || !result.data) {
        toast.error(result.error ?? "AI explanation failed. Try again.");
        return;
      }

      setExplanation(result.data.explanation);
      setActiveTab("explain");
    } catch {
      if (mountedRef.current) {
        toast.error("AI explanation failed. Try again.");
      }
    } finally {
      if (mountedRef.current) {
        setIsExplaining(false);
      }
    }
  }

  // Height is applied imperatively (not via React state) so a resize never forces a
  // re-render of the controlled <Editor>: doing so mid-keystroke raced with Monaco's own
  // content sync and dropped characters during fast typing.
  const handleMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;

      const syncHeight = () => {
        // Force a remeasure against the container's actual current width before reading
        // content height. Monaco's word-wrap width is otherwise whatever it was at
        // construction time, which is stale when this editor mounts inside a Sheet that's
        // still mid-transition (e.g. a second, SWR-cache-hit open of the same drawer skips
        // the loading-skeleton frame that normally gives layout time to settle first,
        // so Monaco measures against a container that hasn't reached its final size yet).
        editor.layout();
        // Only lower the floor for the collapsed editor (minHeight === MIN_HEIGHT) — the
        // expanded modal is already full-size, so it doesn't need this. A smaller floor
        // keeps the collapsed editor from dominating short mobile viewports (e.g. inside
        // the Create Item dialog, where it was pushing the whole modal past the screen).
        const effectiveMinHeight =
          minHeight === MIN_HEIGHT && window.innerWidth < MOBILE_MAX_WIDTH
            ? MIN_HEIGHT_MOBILE
            : minHeight;
        const height = Math.min(maxHeight, Math.max(effectiveMinHeight, editor.getContentHeight()));
        if (wrapperRef.current) wrapperRef.current.style.height = `${height}px`;
        // Monaco doesn't know the wrapper's height just changed, so its internal viewport/
        // scroll positioning would otherwise lag a frame behind the new container size.
        editor.layout();
      };
      // Defer the first sync two animation frames so the browser has committed a real
      // layout/paint pass first, rather than measuring mid-transition.
      requestAnimationFrame(() => requestAnimationFrame(syncHeight));
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
          {explanation !== null ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "code" | "explain")}>
              <TabsList variant="line">
                <TabsTrigger value="code">Code</TabsTrigger>
                <TabsTrigger value="explain">Explain</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            language && <span className="text-xs text-neutral-400">{language}</span>
          )}
          {itemId &&
            (isPro ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleExplain}
                disabled={isExplaining}
                aria-label={isExplaining ? "Generating explanation…" : "Explain code"}
                className="text-neutral-400 hover:text-neutral-200"
              >
                {isExplaining ? <Loader2 className="animate-spin" /> : <Sparkles />}
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger
                  aria-disabled="true"
                  aria-label="Explain code — AI features require Pro subscription"
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
            aria-label="Copy code"
            className="text-neutral-400 hover:text-neutral-200"
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
      </div>
      <div className={activeTab === "explain" ? "hidden" : undefined}>
        <div ref={wrapperRef} style={{ height: minHeight }}>
          <Editor
            height="100%"
            language={language?.toLowerCase() || "plaintext"}
            value={value}
            onChange={(v) => onChange?.(v ?? "")}
            onMount={handleMount}
            beforeMount={handleBeforeMount}
            theme={preferences.theme}
            options={{
              readOnly,
              domReadOnly: readOnly,
              automaticLayout: true,
              minimap: { enabled: preferences.minimap },
              fontSize: preferences.fontSize,
              tabSize: preferences.tabSize,
              scrollBeyondLastLine: false,
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: readOnly ? "none" : "line",
              wordWrap: preferences.wordWrap ? "on" : "off",
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
                // Monaco defaults to always calling preventDefault()/
                // stopPropagation() on wheel events over the editor, even
                // once it has nothing left to scroll — so a wheel gesture
                // over this small, capped-height box (inside a scrollable
                // dialog/drawer) never reaches the dialog at all. Letting
                // Monaco give up the event once it's at its own scroll
                // boundary lets the page scroll normally, the way any other
                // field in this form already does.
                alwaysConsumeMouseWheel: false,
              },
            }}
          />
        </div>
      </div>
      {explanation !== null && (
        <div
          className={cn(
            "overflow-y-auto px-3 py-2.5",
            activeTab === "code" && "hidden"
          )}
          style={{ minHeight, maxHeight }}
        >
          {isExplaining ? (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Loader2 className="size-3.5 animate-spin" />
              Generating explanation…
            </div>
          ) : (
            <div className="markdown-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{explanation}</ReactMarkdown>
            </div>
          )}
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
