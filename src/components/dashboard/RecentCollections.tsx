import { collections } from "@/lib/mock-data";
import { CollectionCard } from "./CollectionCard";

export function RecentCollections() {
  return (
    <section>
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-xl font-bold">Recent Collections</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>
    </section>
  );
}
