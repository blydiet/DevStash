"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { ItemDrawer } from "./ItemDrawer";

interface ItemDrawerContextValue {
  openItem: (id: string) => void;
}

const ItemDrawerContext = createContext<ItemDrawerContextValue | null>(null);

export function useItemDrawer() {
  const context = useContext(ItemDrawerContext);

  if (!context) {
    throw new Error("useItemDrawer must be used within an ItemDrawerProvider");
  }

  return context ?? null;
}

export function ItemDrawerProvider({ children }: { children: ReactNode }) {
  const [itemId, setItemId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function openItem(id: string) {
    setItemId(id);
    setOpen(true);
  }

  return (
    <ItemDrawerContext.Provider value={{ openItem }}>
      {children}
      <ItemDrawer itemId={itemId} open={open} onOpenChange={setOpen} />
    </ItemDrawerContext.Provider>
  );
}
