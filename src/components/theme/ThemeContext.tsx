"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { setTheme as setThemeCookie } from "@/actions/theme";
import type { Theme } from "@/lib/theme-cookie";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const SYNC_CHANNEL_NAME = "devstash-theme-sync";

function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

// Seeded from the theme cookie the server already resolved into the <html>
// class in the root layout — no flash-of-wrong-theme guard needed, since the
// initial value here always matches what was actually rendered.
export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  // Bumped on every toggle (local or remote) so a stale response from an
  // earlier request — network reordering, a slow request superseded by a
  // fast second click, or another tab syncing in first — can't clobber a
  // newer outcome. Only the latest request's result is ever applied.
  const requestIdRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    channelRef.current = channel;
    // Another tab already persisted the cookie — just mirror its choice
    // locally, no need to write it again. Bump requestIdRef too, so any
    // local toggle still in flight in this tab is superseded the moment a
    // remote sync arrives, the same rule applied to local toggles below.
    channel.onmessage = (event: MessageEvent<Theme>) => {
      requestIdRef.current += 1;
      applyThemeClass(event.data);
      setTheme(event.data);
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const previous = theme;
    const next: Theme = previous === "dark" ? "light" : "dark";
    const requestId = ++requestIdRef.current;

    applyThemeClass(next);
    setTheme(next);
    channelRef.current?.postMessage(next);

    setThemeCookie(next).catch(() => {
      if (requestIdRef.current !== requestId) {
        // Superseded by a newer toggle or a remote sync — that request owns
        // the outcome now.
        return;
      }
      applyThemeClass(previous);
      setTheme(previous);
      channelRef.current?.postMessage(previous);
      toast.error("Couldn't save your theme preference. Please try again.");
    });
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
