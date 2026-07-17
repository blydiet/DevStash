import { items } from "@/lib/mock-data";
import { ItemRow } from "./ItemRow";

export function RecentItems() {
  const recentItems = [...items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return (
    <section>
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-xl font-bold">Recent Items</h2>
      </div>
      <div className="flex flex-col gap-3">
        {recentItems.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
