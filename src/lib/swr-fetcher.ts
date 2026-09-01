import type { ItemDetail } from "@/lib/db/items-queries";
import type { CollectionDetail, CollectionOption } from "@/lib/db/collections";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

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

export async function updateCollectionMutation(
  url: string,
  { arg }: { arg: { name: string; description: string | null } },
): Promise<CollectionDetail> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(arg),
    });
  } catch {
    throw new Error("Failed to update collection");
  }

  if (res.status === 401) {
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.success) {
    throw new Error(body?.error ?? "Failed to update collection");
  }

  return body.data as CollectionDetail;
}

export async function deleteCollectionMutation(url: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { method: "DELETE" });
  } catch {
    throw new Error("Failed to delete collection");
  }

  if (res.status === 401) {
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.success) {
    throw new Error(body?.error ?? "Failed to delete collection");
  }
}
