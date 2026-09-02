"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface GlobalSearchContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function useGlobalSearch() {
  const context = useContext(GlobalSearchContext);

  if (!context) {
    throw new Error("useGlobalSearch must be used within a GlobalSearchProvider");
  }

  return context;
}

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      if (event.code === "KeyK" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <GlobalSearchContext.Provider value={{ open, setOpen }}>
      {children}
    </GlobalSearchContext.Provider>
  );
}
