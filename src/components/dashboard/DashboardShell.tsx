"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ItemDrawerProvider } from "./ItemDrawerContext";
import { GlobalSearchProvider } from "./GlobalSearchContext";
import { EditorPreferencesProvider } from "./EditorPreferencesContext";
import { TopBar } from "./TopBar";

export function DashboardShell({
  sidebar,
  search,
  children,
}: {
  sidebar: ReactNode;
  search: ReactNode;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleSidebar() {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setSidebarOpen((open) => !open);
    } else {
      setMobileOpen((open) => !open);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === "Escape") {
         setSidebarOpen(false);
         setMobileOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }


  }, [setSidebarOpen])

  return (
    <EditorPreferencesProvider>
      <GlobalSearchProvider>
        <div className="flex h-full flex-col">
          <TopBar onToggleSidebar={toggleSidebar} />
          <div className="flex flex-1 overflow-hidden">
            <aside
              className={cn(
                "hidden shrink-0 overflow-hidden border-r border-border transition-all duration-200 md:block",
                sidebarOpen ? "w-64" : "w-0 border-r-0"
              )}
            >
              <div className="w-64">{sidebar}</div>
            </aside>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetContent side="left" className="w-64 p-0 md:hidden">
                <SheetTitle className="sr-only">Sidebar</SheetTitle>
                {sidebar}
              </SheetContent>
            </Sheet>

            <main className="flex-1 overflow-y-auto p-6">
              <ItemDrawerProvider>
                {children}
                {search}
              </ItemDrawerProvider>
            </main>
          </div>
        </div>
      </GlobalSearchProvider>
    </EditorPreferencesProvider>
  );
}
