import { onActivationKeydown } from "@/lib/keyboard-activation";

// Spread onto a non-native clickable container (a Card/div acting as a
// button, e.g. an item row that opens the drawer on click) to get a
// consistent click + keyboard-activation + a11y-label contract in one place.
export function clickableRowProps(onActivate: () => void, label: string) {
  return {
    onClick: onActivate,
    onKeyDown: onActivationKeydown(onActivate),
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
  };
}
