"use client";

import { Crown, Loader2, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AiActionButtonProps {
  isPro: boolean;
  isPending: boolean;
  onClick: () => void;
  label: string;
  pendingLabel: string;
}

// Shared by CodeEditor (Explain) and MarkdownEditor (Optimize) — a
// Pro-gated AI action icon: a working Sparkles/Loader2 button for Pro
// users, or a disabled Crown with an upgrade-explaining tooltip for free
// users. Callers gate rendering on itemId themselves (this action only
// applies to already-saved items), so this component assumes it should
// always render once mounted.
export function AiActionButton({ isPro, isPending, onClick, label, pendingLabel }: AiActionButtonProps) {
  if (!isPro) {
    return (
      <Tooltip>
        <TooltipTrigger
          aria-disabled="true"
          aria-label={`${label} - AI features require Pro subscription`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-xs" }),
            "cursor-not-allowed text-neutral-500 hover:bg-transparent hover:text-neutral-500"
          )}
        >
          <Crown />
        </TooltipTrigger>
        <TooltipContent>AI features require Pro subscription</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      disabled={isPending}
      aria-label={isPending ? pendingLabel : label}
      className="text-neutral-400 hover:text-neutral-200"
    >
      {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
    </Button>
  );
}
