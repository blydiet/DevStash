"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import VisuallyHidden from "@/components/VisuallyHidden/VisuallyHidden";

interface ExpandableEditorDialogProps {
  expanded: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

// Shared by CodeEditor/MarkdownEditor's "expand into a modal" affordance —
// renders the panel inline when collapsed, or the same panel inside a Dialog
// when expanded, so both editors get identical modal chrome/sizing.
export function ExpandableEditorDialog({ expanded, onOpenChange, children }: ExpandableEditorDialogProps) {
  if (!expanded) return children;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden rounded-lg bg-transparent p-0 ring-0 sm:max-w-3xl"
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>Content</DialogTitle>
        </VisuallyHidden>
        {children}
      </DialogContent>
    </Dialog>
  );
}
