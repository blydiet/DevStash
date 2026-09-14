import type { ItemDetail } from "@/lib/db/items-queries";
import type { CollectionDetail, CollectionOption, CollectionSummary } from "@/lib/db/collections";
import type { EditorPreferences } from "@/lib/editor-preferences";
import type { ToggleCollectionFavoriteResponse } from "@/types/collections";
import type { GlobalSearchData } from "@/types/search";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function fetchItemDetail(url: string): Promise<ItemDetail> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Failed to load item");
  }

  if (res.status === 401) {
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.success) {
    throw new Error(body?.error ?? "Failed to load item");
  }

  return body.data as ItemDetail;
}

export async function fetchCollectionOptions(url: string): Promise<CollectionOption[]> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Failed to load collections");
  }

  if (res.status === 401) {
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.success) {
    throw new Error(body?.error ?? "Failed to load collections");
  }

  return body.data as CollectionOption[];
}

export async function fetchGlobalSearchData(url: string): Promise<GlobalSearchData> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Failed to load search data");
  }

  if (res.status === 401) {
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.success) {
    throw new Error(body?.error ?? "Failed to load search data");
  }

  return body.data as GlobalSearchData;
}

export async function fetchEditorPreferences(url: string): Promise<EditorPreferences> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Failed to load preferences");
  }

  if (res.status === 401) {
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.success) {
    throw new Error(body?.error ?? "Failed to load preferences");
  }

  return body.data as EditorPreferences;
}

// Shared by CollectionFormDialog's create and edit modes — bound to a single
// useSWRMutation hook (its key is whichever endpoint the caller resolves:
// "/api/collections" for create, "/api/collections/{id}" for edit), with
// `arg.method` selecting POST vs PATCH so the fetcher itself branches
// instead of needing two separately-mounted mutation hooks.
export async function saveCollectionMutation(
  url: string,
  { arg }: { arg: { method: "POST" | "PATCH"; name: string; description: string | null } },
): Promise<CollectionSummary | CollectionDetail> {
  const { method, ...data } = arg;
  const failureMessage = method === "POST" ? "Failed to create collection" : "Failed to update collection";

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error(failureMessage);
  }

  if (res.status === 401) {
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.success) {
    throw new Error(body?.error ?? failureMessage);
  }

  return body.data as CollectionSummary | CollectionDetail;
}

export async function toggleCollectionFavoriteMutation(
  url: string,
  { arg }: { arg: { isFavorite: boolean } },
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(arg),
    });
  } catch {
    throw new Error("Failed to update favorite");
  }

  if (res.status === 401) {
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  const body = (await res.json().catch(() => null)) as ToggleCollectionFavoriteResponse | null;

  if (!res.ok || !body?.success) {
    throw new Error(body?.error ?? "Failed to update favorite");
  }
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
