import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { Reveal } from "@/components/homepage/Reveal";
import { ITEM_TYPES } from "@/lib/item-types";

const colorFor = (value: string) => ITEM_TYPES.find((t) => t.value === value)?.color ?? "#3b82f6";

const CHECKLIST = [
  "Auto-tagging on save",
  "One-line AI summaries",
  "Explain any snippet, instantly",
  "Prompt optimization built in",
];

const TAGS = [
  { label: "react", color: colorFor("snippet"), delay: "0.1s" },
  { label: "hooks", color: colorFor("command"), delay: "0.3s" },
  { label: "debounce", color: colorFor("note"), delay: "0.5s" },
  { label: "typescript", color: colorFor("link"), delay: "0.7s" },
];

export function AiSection() {
  return (
    <section className="border-t border-[var(--hp-border)] bg-gradient-to-b from-[var(--hp-bg-alt)] to-[var(--hp-bg)] px-6 py-30">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal className="min-w-0">
          <span className="font-mono-hp mb-[18px] inline-block rounded-full border border-[var(--hp-accent)]/30 bg-[var(--hp-accent-soft)] px-3 py-[5px] text-[0.6875rem] tracking-[0.08em] text-[var(--hp-accent)] uppercase">
            Pro feature
          </span>
          <h2 className="mb-3.5 text-left text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.2] font-bold tracking-tight">
            Let AI do the filing
          </h2>
          <p className="mb-7 max-w-[42ch] text-[1.0625rem] text-[var(--hp-text-secondary)]">
            Save something and gpt-5-nano quietly organizes it behind the scenes.
          </p>
          <ul className="flex flex-col gap-4">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-center gap-3 text-[0.9375rem]">
                <CheckCircle2
                  className="size-[1.375rem] shrink-0"
                  style={{ color: colorFor("note") }}
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="min-w-0">
          <div className="overflow-hidden rounded-[14px] border border-[var(--hp-border)] bg-[#0d0d11] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            {/* A real screenshot of this app's own CodeEditor component
                (Monaco, real syntax highlighting) rendering the actual
                seeded "useDebounce Hook" snippet — not a hand-built fake
                editor. Loading the real Monaco-backed component live on
                the public marketing page isn't worth the bundle weight for
                a below-the-fold visual, so a static capture stands in for
                it instead. */}
            <Image
              src="/homepage/ai-code-preview.png"
              alt="DevStash's code editor showing a TypeScript useDebounce hook"
              width={768}
              height={330}
              className="h-auto w-full"
            />
            <div
              className="flex flex-wrap items-center gap-2 border-t border-[var(--hp-border)] px-5 pt-3.5 pb-5"
              aria-label="AI generated tags"
            >
              <span className="font-mono-hp mr-1 text-[0.6875rem] tracking-[0.06em] text-[var(--hp-text-tertiary)] uppercase">
                AI generated tags
              </span>
              {TAGS.map((tag) => (
                <span
                  key={tag.label}
                  className="hp-tag-chip font-mono-hp rounded-full border px-2.5 py-1 text-xs"
                  style={{
                    color: tag.color,
                    backgroundColor: `${tag.color}29`,
                    borderColor: `${tag.color}59`,
                    animationDelay: tag.delay,
                  }}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
