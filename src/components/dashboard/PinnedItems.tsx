import { Pin } from "lucide-react";
import { items } from "@/lib/mock-data";
import { ItemRow } from "./ItemRow";

export function PinnedItems() {
  const pinnedItems = items.filter((item) => item.isPinned);

  if (pinnedItems.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 pb-4">
        <Pin className="size-4 text-muted-foreground" />
        <h2 className="text-xl font-bold">Pinned</h2>
      </div>
      <div className="flex flex-col gap-3">
        {pinnedItems.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
