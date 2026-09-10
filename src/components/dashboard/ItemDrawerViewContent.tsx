import { File, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CodeEditor } from "@/components/dashboard/CodeEditor";
import { MarkdownEditor } from "@/components/dashboard/MarkdownEditor";
import { formatFileSize } from "@/lib/file-constraints";
import { typeShowsCodeEditor, typeShowsMarkdownEditor } from "@/lib/item-type-capabilities";
import type { ItemDetail } from "@/lib/db/items-queries";

export function ItemDrawerViewContent({
  item,
  isPro,
  onApplyOptimizedPrompt,
}: {
  item: ItemDetail;
  isPro: boolean;
  // Only meaningful for Prompt items — passed through to MarkdownEditor's
  // onApply so the drawer (which owns the SWR cache and the
  // updateItemContent call) can persist an accepted optimization. Note
  // items share the same MarkdownEditor component but never receive this,
  // so they never render the Optimize button either.
  onApplyOptimizedPrompt?: (newContent: string) => Promise<boolean>;
}) {
  const showsCodeEditor = typeShowsCodeEditor(item.type.name);
  const showsMarkdownEditor = typeShowsMarkdownEditor(item.type.name);
  const isPrompt = item.type.name === "prompt";

  return (
    <>
      {item.description && (
        <div>
          <h3 className="pb-2 text-sm font-medium text-muted-foreground">Description</h3>
          <p className="text-sm">{item.description}</p>
        </div>
      )}

      {item.content && (
        <div>
          <h3 className="pb-2 text-sm font-medium text-muted-foreground">Content</h3>
          {showsCodeEditor ? (
            // Keyed by item id: ItemDrawerProvider's openItem() can switch
            // itemId while the drawer stays open (e.g. clicking a different
            // item while this one's drawer is already showing), which
            // doesn't unmount this tree — without this key, CodeEditor's
            // local explanation/tab state would leak from the previous item
            // onto the next one instead of resetting.
            <CodeEditor
              key={item.id}
              value={item.content}
              language={item.language}
              readOnly
              itemId={item.id}
              isPro={isPro}
            />
          ) : showsMarkdownEditor ? (
            <MarkdownEditor
              key="view"
              value={item.content}
              readOnly
              itemId={isPrompt ? item.id : undefined}
              isPro={isPrompt ? isPro : undefined}
              onApply={isPrompt ? onApplyOptimizedPrompt : undefined}
            />
          ) : null}
        </div>
      )}

      {item.url && (
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

      {item.type.name === "image" && item.fileUrl && (
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

      {item.type.name === "file" && item.fileName && (
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

      {item.tags.length > 0 && (
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
      )}
    </>
  );
}
