import type { ItemType } from "@/lib/item-types";

// Both of these return a CSS `var()` expression rather than a hex literal,
// so the color tracks the light/dark --hp-* split in homepage.css instead of
// going stale in one mode. Callers must therefore treat the return value as
// an opaque CSS color: to derive a translucent tint from it, use
// `color-mix(in srgb, <color> N%, transparent)` — appending hex alpha
// (`${color}29`) silently produces invalid CSS and drops the declaration.
export const FALLBACK_TYPE_COLOR = "var(--hp-text-tertiary)";

// Keyed by ItemType, so adding an item type in src/lib/item-types.ts without
// also adding its --hp-type-* token pair in homepage.css fails to compile
// rather than resolving to an undefined var at runtime.
const TYPE_COLOR_VARS: Record<ItemType, string> = {
  snippet: "var(--hp-type-snippet)",
  prompt: "var(--hp-type-prompt)",
  command: "var(--hp-type-command)",
  note: "var(--hp-type-note)",
  file: "var(--hp-type-file)",
  image: "var(--hp-type-image)",
  link: "var(--hp-type-link)",
};

export function typeColor(value: string) {
  return TYPE_COLOR_VARS[value as ItemType] ?? FALLBACK_TYPE_COLOR;
}

// Translucent tint of a type color, for icon-badge and chip backgrounds.
export function typeColorTint(color: string, percent: number) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
