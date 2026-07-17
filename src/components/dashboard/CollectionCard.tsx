import { Folder, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { iconMap } from "@/lib/icon-map";
import { items, itemTypes, type Collection } from "@/lib/mock-data";

export function CollectionCard({ collection }: { collection: Collection }) {
  const typeIds = new Set(
    items.filter((item) => item.collectionId === collection.id).map((item) => item.typeId)
  );
  const types = itemTypes.filter((type) => typeIds.has(type.id));

  return (
    <Card
      className="border-l-4 border-y-0 border-r-0"
      style={{ borderLeftColor: collection.color }}
    >
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            {collection.name}
            {collection.isFavorite && (
              <Star className="size-4 fill-yellow-500 text-yellow-500" />
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{collection.itemCount} items</p>
        <p className="text-sm text-muted-foreground">{collection.description}</p>
        <div className="flex items-center gap-2">
          {types.map((type) => {
            const Icon = iconMap[type.icon] ?? Folder;
            return <Icon key={type.id} className="size-4" style={{ color: type.color }} />;
          })}
        </div>
      </CardContent>
    </Card>
  );
}
