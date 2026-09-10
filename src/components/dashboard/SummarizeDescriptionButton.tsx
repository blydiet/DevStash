"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { summarizeDraft } from "@/actions/ai";

interface SummarizeDescriptionButtonProps {
  title: string;
  content: string;
  url: string;
  description: string;
  onSummarized: (description: string) => void;
}

// Shared by the Create Item dialog and the item drawer's edit mode — same
// summarizeDraft call, same confirm-before-overwrite guard (including the
// "is there something to lose" emptiness check, kept here rather than as a
// caller-computed prop so both call sites can't drift apart on it), and
// same upgrade-toast handling; differing only in where title/content/url
// and the resulting description live in each caller's own form state.
//
// `mountedRef` below guards one specific failure mode: this exact component
// instance gets removed from the tree (unmounted) while summarizeDraft is
// still in flight, and the eventual response would otherwise call
// setState/toast/router.push on a screen the user already navigated away
// from. A caller that resets its form to a *new* object without unmounting
// this component (CreateItemDialog does — see its `key={formGeneration}` on
// this component) needs that pairing for the guard to take effect;
// ItemDrawerEditForm doesn't need one, since it only renders this component
// while `mode === "edit"` and naturally unmounts it otherwise.
export function SummarizeDescriptionButton({
  title,
  content,
  url,
  description,
  onSummarized,
}: SummarizeDescriptionButtonProps) {
  const router = useRouter();
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mountedRef = useRef(true);

  // The setup function has to set this true (not just useRef's initial
  // value) — React's dev-only StrictMode runs setup→cleanup→setup once on
  // mount to surface exactly this class of bug. With only a cleanup
  // function here, that extra cleanup flips mountedRef.current to false
  // with nothing to ever set it back, permanently marking a fully-mounted,
  // interactive component as unmounted from its very first render.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function runSummarize() {
    setIsSummarizing(true);
    try {
      const result = await summarizeDraft(title, content, url);
      if (!mountedRef.current) return;

      if (!result.success || !result.data) {
        toast.error(result.error ?? "AI summary failed. Try again.", {
          action: result.upgradeRequired
            ? { label: "Upgrade", onClick: () => router.push("/upgrade?feature=ai") }
            : undefined,
        });
        return;
      }

      onSummarized(result.data.description);
    } catch {
      if (mountedRef.current) {
        toast.error("AI summary failed. Try again.");
      }
    } finally {
      if (mountedRef.current) {
        setIsSummarizing(false);
      }
    }
  }

  function handleClick() {
    if (isSummarizing) return;

    // A description is a single field, unlike tags' additive merge —
    // generating a new one replaces whatever's there. Only confirm when
    // there's actually existing text to lose; an empty (or whitespace-only)
    // field is the common case and stays frictionless.
    if (description.trim() !== "") {
      setConfirmOpen(true);
      return;
    }

    runSummarize();
  }

  function handleConfirm() {
    setConfirmOpen(false);
    runSummarize();
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" disabled={isSummarizing} onClick={handleClick}>
        <Sparkles />
        {isSummarizing ? "Summarizing…" : "Summarize"}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace description?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces your current description with an AI-generated summary.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSummarizing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isSummarizing}>
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
