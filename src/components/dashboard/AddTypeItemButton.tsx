"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateItemDialog } from "./CreateItemDialog";
import type { ItemType } from "@/lib/item-types";

export function AddTypeItemButton({ type, label }: { type: ItemType; label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="h-7 gap-1 px-2 text-[0.71875rem] sm:h-8 sm:gap-1.5 sm:px-2.5 sm:text-sm"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5 sm:size-4" />
        New {label}
      </Button>
      <CreateItemDialog open={open} onOpenChange={setOpen} defaultType={type} />
    </>
  );
}
