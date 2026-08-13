import { getItemsByType, type ItemSummary } from "@/lib/db/items";
import { ItemCard } from "./ItemCard";

export async function ItemsGrid({ typeName }: { typeName: string }) {
  let items: ItemSummary[] = [];
  let error: string | null = null;

  try {
    items = await getItemsByType(typeName);

    
  } catch (err) {
    
    error = err instanceof Error ? err.message : "Failed to load items";
    
  }
  
  // Handle the case where there are no items 
  // This needs to be checked outside of the try and catch block due to linitng rules

  if (error) {
    return <p className="text-sm text-destructive">Failed to load items: {error}</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No items yet</p>;
  }


  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
