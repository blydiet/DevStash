import Link from "next/link";
import { Folder, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { iconMap } from "@/lib/icon-map";
import { CollectionActionsMenu } from "@/components/dashboard/CollectionActionsMenu";
import type { CollectionSummary } from "@/lib/db/collections";

export function CollectionCard({ collection }: { collection: CollectionSummary }) {
  return (
    <Card
      className="relative rounded-l-none border-l-4 border-y-0 border-r-0 transition-colors hover:bg-muted/50"
      style={{ borderLeftColor: collection.borderColor }}
    >
      <Link
        href={`/collections/${collection.id}`}
        className="absolute inset-0"
        aria-label={`Open ${collection.name}`}
      />
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-medium">
            {collection.name}
            {collection.isFavorite && (
              <Star className="size-4 fill-yellow-500 text-yellow-500" />
            )}
          </div>
          <div className="relative z-10">
            <CollectionActionsMenu collection={collection} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{collection.itemCount} items</p>
        <p className="text-sm text-muted-foreground">{collection.description}</p>
        <div className="flex items-center gap-2">
          {collection.types.map((type) => {
            const Icon = iconMap[type.icon ?? ""] ?? Folder;
            return <Icon key={type.id} className="size-4" style={{ color: type.color ?? undefined }} />;
          })}
        </div>
      </CardContent>
    </Card>
  );
}
