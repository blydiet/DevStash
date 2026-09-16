"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Joyride, STATUS, type EventData, type Step } from "react-joyride";
import { Code, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { hasSeenOnboarding, markOnboardingSeen } from "@/lib/onboarding-storage";

function SnippetExample() {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border text-left">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#3b82f61a]">
          <Code className="size-4" style={{ color: "#3b82f6" }} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">useDebounce Hook</p>
          <div className="mt-1 flex gap-1.5">
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              react
            </Badge>
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              hooks
            </Badge>
          </div>
        </div>
      </div>
      <pre className="overflow-x-auto bg-[#1e1e1e] p-3 font-mono text-[11px] leading-relaxed whitespace-pre text-[#d4d4d4]">
        <code>{`function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  // ...
}`}</code>
      </pre>
    </div>
  );
}

const STEPS: Step[] = [
  {
    target: "body",
    placement: "center",
    title: (
      <span className="flex items-center gap-2">
        <Package className="size-5 text-primary" />
        Welcome to DevStash
      </span>
    ),
    content: (
      <p className="text-left text-sm text-muted-foreground">
        Store Smarter. Build Faster. DevStash is your searchable home for
        snippets, prompts, commands, notes, and links. Here&apos;s a quick
        tour of the basics.
      </p>
    ),
  },
  {
    target: '[data-tour="new-item-button"]',
    title: "Save anything in seconds",
    // This target is the rightmost button in the top bar, only ~12px from
    // the true edge on a narrow phone viewport. The tooltip box needs a
    // visual gutter from that edge, but the arrow needs its own clearance
    // from the box's edge on top of that — stacked, they leave the arrow
    // ~10px short of the target's true center on a 375px-wide screen
    // (confirmed empirically; measured exactly 0px off at 1280px, where
    // the target sits far from any edge). Rather than shrinking the box's
    // gutter to fix the arrow (a real box/arrow trade-off, not a bug —
    // shiftOptions.padding trades the two directly against each other),
    // nudge the arrow directly: 0px at >=768px (already correct there)
    // ramping linearly to 10px at <=375px, purely in CSS so it tracks the
    // live viewport with no JS/resize listener.
    styles: {
      arrow: {
        transform: "translateX(clamp(0px, calc((768px - 100vw) * 10 / 393), 10px))",
      },
    },
    content: (
      <div className="flex flex-col gap-3 text-left">
        <p className="text-sm text-muted-foreground">
          Click <span className="font-medium text-foreground">New Item</span>{" "}
          to save a snippet, prompt, command, note, or link. Here&apos;s what
          a saved snippet looks like:
        </p>
        <SnippetExample />
      </div>
    ),
  },
  {
    target: '[data-tour="new-collection-button"]',
    title: "Group items into collections",
    content: (
      <p className="text-left text-sm text-muted-foreground">
        Click <span className="font-medium text-foreground">New Collection</span>{" "}
        to bundle related items together — a collection can mix snippets,
        links, and notes from the same project. Browse by type or collection
        anytime from the sidebar.
      </p>
    ),
  },
  {
    target: '[data-tour="search-bar"]',
    title: "Find anything instantly",
    content: (
      <p className="text-left text-sm text-muted-foreground">
        Press ⌘K to search everything in your stash — titles, content, and
        tags all at once.
      </p>
    ),
  },
  {
    target: '[data-tour="favorites-button"]',
    title: "Keep your favorites close",
    // Narrower than the default 380px: this target sits near the far-left
    // edge of the top bar, so a full-width tooltip centered under it hugs
    // the left side of the screen with a lot of empty space to the right —
    // a shorter box keeps it visually balanced under a short message.
    width: 280,
    content: (
      <p className="text-left text-sm text-muted-foreground">
        Star any item to pin it here, so your most-used snippets and links
        are always one click away.
      </p>
    ),
  },
];

export function OnboardingTour() {
  const { data: session, status } = useSession();
  const [run, setRun] = useState(false);
  // Captured once, when the tour starts, rather than re-read from `session`
  // when it ends — so the finish handler always has an id to write against
  // even if the session value momentarily changes shape while the tour runs.
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState(status);

  // Signing out while the tour is running (e.g. in another tab) should stop
  // it rather than leave it spotlighting elements of a now-signed-out app.
  // This resets state in response to a changed value (status), so it's done
  // during render (comparing against the last-seen status) rather than in an
  // effect — the same react-hooks/set-state-in-effect-safe pattern used
  // elsewhere in this codebase (see ItemDrawer.tsx's resetKey/lastResetKey).
  if (status !== lastStatus) {
    setLastStatus(status);
    if (status === "unauthenticated") {
      setRun(false);
      setActiveUserId(null);
    }
  }

  // Whether to start the tour on a newly-available userId is also decided
  // during render rather than in an effect: hasSeenOnboarding is a
  // synchronous localStorage read, not a subscription to some external
  // system's async updates, so per React's "you might not need an effect"
  // guidance this is plain derived state, guarded the same resetKey way so
  // it only runs once per userId change, not every render.
  const userId = status === "authenticated" ? (session?.user?.id ?? null) : null;
  const [lastUserId, setLastUserId] = useState(userId);
  if (userId !== lastUserId) {
    setLastUserId(userId);
    // No storage arg to hasSeenOnboarding: resolves to the real
    // window.localStorage. That fallback resolution — and any throw from it
    // (private browsing, storage disabled) — happens inside
    // hasSeenOnboarding's own try/catch (see onboarding-storage.ts), so this
    // call can't throw here either; covered directly by
    // onboarding-storage.test.ts's "window.localStorage itself throws" cases.
    if (userId && !hasSeenOnboarding(userId)) {
      setActiveUserId(userId);
      setRun(true);
    }
  }

  function handleEvent(data: EventData) {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      setRun(false);
      if (activeUserId) markOnboardingSeen(activeUserId);
    }
  }

  return (
    <Joyride
      run={run}
      steps={STEPS}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      locale={{ back: "Back", last: "Get Started", next: "Next", skip: "Skip" }}
      options={{
        backgroundColor: "var(--popover)",
        textColor: "var(--popover-foreground)",
        primaryColor: "var(--primary)",
        arrowColor: "var(--popover)",
        buttons: ["skip", "back", "primary"],
        // Smaller than the default 10px: the top bar's buttons sit only
        // 8px apart (gap-2), so the default padding made the spotlight
        // cutout for one button bleed a sliver into its neighbor.
        spotlightPadding: 6,
        showProgress: true,
        zIndex: 10000,
        // Without this, the spotlighted target stays clickable (default
        // false) — clicking New Item/New Collection mid-tour opens the real
        // CreateItemDialog/CollectionFormDialog underneath this overlay's
        // zIndex (10000, vs. the app's dialogs at z-50), rendering it
        // invisible/inert behind the tour. Blocking target interaction is
        // the standard fix (over lowering this zIndex below z-50, which
        // would defeat the overlay's job of sitting above the whole page).
        blockTargetInteraction: true,
        // The default 380px is wider than small phone viewports (e.g.
        // 375px), which forces the floater into an extreme reposition to
        // stay on-screen and visibly desyncs the arrow from the target's
        // true center. Capping width to the viewport (minus a 16px gutter
        // on each side) keeps the tooltip fully on-screen at any width.
        width: "min(380px, calc(100vw - 32px))",
      }}
    />
  );
}
