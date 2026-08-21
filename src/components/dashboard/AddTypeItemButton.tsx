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
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New {label}
      </Button>
      <CreateItemDialog open={open} onOpenChange={setOpen} defaultType={type} />
    </>
  );
}
