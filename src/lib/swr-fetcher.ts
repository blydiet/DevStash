import type { ItemDetail } from "@/lib/db/items-queries";

export async function fetchItemDetail(url: string): Promise<ItemDetail> {
  const res = await fetch(url);
  const body = await res.json();

  if (!res.ok || !body.success) {
    throw new Error(body.error ?? "Failed to load item");
  }

  return body.data as ItemDetail;
}
