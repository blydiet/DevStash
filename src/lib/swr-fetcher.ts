import type { ItemDetail } from "@/lib/db/items-queries";
import type { CollectionOption } from "@/lib/db/collections";

export async function fetchItemDetail(url: string): Promise<ItemDetail> {
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to load item");
  }

  const body = await res.json();

  if (!body.success) {
    throw new Error(body.error ?? "Failed to load item");
  }

  return body.data as ItemDetail;
}

export async function fetchCollectionOptions(url: string): Promise<CollectionOption[]> {
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to load collections");
  }

  const body = await res.json();

  if (!body.success) {
    throw new Error(body.error ?? "Failed to load collections");
  }

  return body.data as CollectionOption[];
}
