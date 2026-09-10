import Link from "next/link";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

// Renders nothing for Pro users. Takes `isPro` as a prop rather than calling
// auth() itself — every DashboardShell caller now already resolves
// session-derived isPro once (needed for the item drawer's AI Explain
// gating too), so re-deriving it here a second time per page would just be
// a redundant, duplicate session read.
export function UpgradeNavButton({ isPro }: { isPro: boolean }) {
  if (isPro) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Upgrade"
      className="shrink-0 sm:w-auto sm:gap-[4px] sm:px-3"
      nativeButton={false}
      render={<Link href="/upgrade" />}
    >
      <Zap className="size-4" />
      <span className="hidden sm:inline">Upgrade</span>
    </Button>
  );
}
