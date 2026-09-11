import type { KeyboardEvent } from "react";

// For a non-native clickable container (a Card/div with onClick, not a real
// button/link) that also nests real interactive children (e.g. a favorite
// toggle button). Only fires when Enter/Space lands on the container itself
// (e.target === e.currentTarget) — a keydown on a nested button bubbles up
// through this handler too, but that button already has its own native
// Enter/Space → click behavior, so re-triggering the container's activation
// on top of that would fire both actions at once.
export function onActivationKeydown(onActivate: () => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onActivate();
  };
}
