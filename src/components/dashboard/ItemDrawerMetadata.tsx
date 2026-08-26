import { Calendar, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/item-drawer-utils";
import type { ItemDetail } from "@/lib/db/items";

export function ItemDrawerMetadata({ item }: { item: ItemDetail }) {
  return (
    <>
      {item.collection && (
        <div>
          <h3 className="flex items-center gap-1.5 pb-2 text-sm font-medium text-muted-foreground">
            <FolderOpen className="size-4" />
            Collections
          </h3>
          <Badge variant="secondary">{item.collection.name}</Badge>
        </div>
      )}

      <div>
        <h3 className="flex items-center gap-1.5 pb-2 text-sm font-medium text-muted-foreground">
          <Calendar className="size-4" />
          Details
        </h3>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{formatDate(item.createdAt as unknown as string)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span>{formatDate(item.updatedAt as unknown as string)}</span>
          </div>
        </div>
      </div>
    </>
  );
}
