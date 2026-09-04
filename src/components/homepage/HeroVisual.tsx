"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, AppWindow, SquareTerminal, FileText, Bookmark } from "lucide-react";
import { createChaosAnimation, type ChaosBody } from "@/lib/homepage/chaos-physics";
import { ITEM_TYPES } from "@/lib/item-types";

const LOGO_ICONS = [
  { alt: "Notion", src: "/logos/notion.svg" },
  { alt: "GitHub", src: "/logos/github.svg" },
  { alt: "Discord", src: "/logos/discord.svg" },
  { alt: "Sublime Text", src: "/logos/sublimetext.svg" },
];

const GLYPH_ICONS = [
  { alt: "Browser tabs", Icon: AppWindow },
  { alt: "Terminal", Icon: SquareTerminal },
  { alt: "Text file", Icon: FileText },
  { alt: "Bookmark", Icon: Bookmark },
];

const FALLBACK_TYPE_COLOR = "#6a6a75";

const typeColor = (value: (typeof ITEM_TYPES)[number]["value"]) =>
  ITEM_TYPES.find((t) => t.value === value)?.color ?? FALLBACK_TYPE_COLOR;

const SIDEBAR_TYPES: Array<{ value: (typeof ITEM_TYPES)[number]["value"]; label: string }> = [
  { value: "snippet", label: "Snippets" },
  { value: "prompt", label: "Prompts" },
  { value: "command", label: "Commands" },
  { value: "note", label: "Notes" },
];

const MINI_CARDS: Array<{ title: string; type: (typeof ITEM_TYPES)[number]["value"] }> = [
  { title: "useDebounce Hook", type: "snippet" },
  { title: "Explain this regex", type: "prompt" },
  { title: "Tailwind CSS Docs", type: "link" },
  { title: "docker compose up", type: "command" },
  { title: "Sprint retro notes", type: "note" },
  { title: "Dashboard mockup.png", type: "image" },
];

function ChaosIconTile({
  alt,
  refCallback,
  children,
}: {
  alt: string;
  refCallback: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={refCallback}
      title={alt}
      className="mx-auto flex size-14 items-center justify-center rounded-xl border border-[var(--hp-border)] bg-[var(--hp-bg-alt)] will-change-transform"
    >
      {children}
    </div>
  );
}

export function HeroVisual() {
  const stageRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tiles = iconRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (tiles.length === 0) return;

    // Tiles render in a plain CSS grid by default (see the JSX below), so
    // if this effect never runs — or throws partway through — whatever
    // hasn't been switched over stays in that grid instead of collapsing
    // to a pile at the stage's top-left corner. Only a tile that's about
    // to be handed to the physics loop gets opted into absolute,
    // transform-driven positioning.
    const bodies: ChaosBody[] = tiles.map((el, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 40 + col * 80 + (Math.random() * 20 - 10);
      const y = 50 + row * 130 + (Math.random() * 20 - 10);

      el.style.position = "absolute";
      el.style.top = "0";
      el.style.left = "0";
      el.style.transform = `translate(${x}px, ${y}px)`;

      return {
        el,
        x,
        y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        rotPhase: Math.random() * Math.PI * 2,
        scalePhase: Math.random() * Math.PI * 2,
      };
    });

    return createChaosAnimation(stage, bodies);
  }, []);

  return (
    <div className="grid w-full grid-cols-1 items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
      <div className="relative h-80 overflow-hidden rounded-[14px] border border-[var(--hp-border)] bg-[var(--hp-bg-card)]">
        <span className="font-mono-hp block px-[18px] pt-4 text-xs tracking-[0.08em] text-[var(--hp-text-tertiary)] uppercase">
          Your knowledge today
        </span>
        <div
          ref={stageRef}
          className="relative grid h-[calc(100%-44px)] grid-cols-4 content-start gap-3 p-3"
          aria-hidden="true"
        >
          {LOGO_ICONS.map((logo, i) => (
            <ChaosIconTile
              key={logo.alt}
              alt={logo.alt}
              refCallback={(el) => {
                iconRefs.current[i] = el;
              }}
            >
              <img src={logo.src} alt="" width={28} height={28} />
            </ChaosIconTile>
          ))}
          {GLYPH_ICONS.map(({ alt, Icon }, i) => (
            <ChaosIconTile
              key={alt}
              alt={alt}
              refCallback={(el) => {
                iconRefs.current[LOGO_ICONS.length + i] = el;
              }}
            >
              <Icon className="size-6 text-[var(--hp-text-secondary)]" />
            </ChaosIconTile>
          ))}
        </div>
      </div>

      <div
        className="hp-arrow mx-auto flex size-11 items-center justify-center rounded-full bg-[var(--hp-accent-soft)] text-[var(--hp-accent)]"
        aria-hidden="true"
      >
        <ArrowRight className="size-5" />
      </div>

      <div className="relative h-80 overflow-hidden rounded-[14px] border border-[var(--hp-border)] bg-[var(--hp-bg-card)]">
        <span className="font-mono-hp block px-[18px] pt-4 text-xs tracking-[0.08em] text-[var(--hp-text-tertiary)] uppercase">
          With DevStash
        </span>
        <div className="grid h-[calc(100%-44px)] grid-cols-[96px_1fr] gap-3.5 p-4 pt-0" aria-hidden="true">
          <div className="flex flex-col gap-2.5 pt-4">
            {SIDEBAR_TYPES.map((type, i) => (
              <span
                key={type.value}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.6875rem] ${
                  i === 0
                    ? "bg-[var(--hp-bg-alt)] text-[var(--hp-text-secondary)]"
                    : "text-[var(--hp-text-tertiary)]"
                }`}
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: typeColor(type.value) }}
                />
                {type.label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 grid-rows-3 gap-2 pt-4">
            {MINI_CARDS.map((card) => (
              <span
                key={card.title}
                className="font-mono-hp flex min-w-0 items-end overflow-hidden rounded-lg border-t-[3px] bg-[var(--hp-bg-alt)] px-2 pb-1.5 text-[0.5625rem] whitespace-nowrap text-[var(--hp-text-secondary)]"
                style={{ borderTopColor: typeColor(card.type) }}
              >
                {card.title}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
