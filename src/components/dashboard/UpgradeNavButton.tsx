import Link from "next/link";
import { Zap } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

// Renders nothing for Pro users. Kept as its own async Server Component
// (rather than threading `isPro` through every page) so every DashboardShell
// caller just passes this in, matching the sidebar/search container pattern.
// Follows the same icon-first, label-on-sm-and-up shape as the New
// Collection/New Item buttons in TopBar, rather than hiding on mobile.
export async function UpgradeNavButton() {
  const session = await auth();

  if (session?.user?.isPro) {
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
