"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeContext";

export function HomeThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--hp-radius-sm)] text-[var(--hp-text-secondary)] transition-colors duration-200 hover:bg-[var(--hp-bg-alt)] hover:text-[var(--hp-text-primary)]"
    >
      {isDark ? <Sun className="size-[1.125rem]" /> : <Moon className="size-[1.125rem]" />}
    </button>
  );
}
