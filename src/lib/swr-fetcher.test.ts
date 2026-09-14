import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  deleteCollectionMutation,
  fetchCollectionOptions,
  fetchItemDetail,
  saveCollectionMutation,
  toggleCollectionFavoriteMutation,
} from "@/lib/swr-fetcher";

function jsonResponse(status: number, ok: boolean, body: unknown): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function nonJsonResponse(status: number, ok: boolean): Response {
  return {
    ok,
    status,
    json: () => Promise.reject(new SyntaxError("Unexpected token < in JSON")),
  } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchItemDetail", () => {
  it("returns data on success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, true, { success: true, data: { id: "item-1" } })
    );

    await expect(fetchItemDetail("/api/items/item-1")).resolves.toEqual({ id: "item-1" });
  });

  it("throws the server's error message on a non-ok JSON response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(404, false, { success: false, error: "Item not found" })
    );

    await expect(fetchItemDetail("/api/items/item-1")).rejects.toThrow("Item not found");
  });

  it("throws an ApiError on a 401 response", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, false, { success: false }));

    await expect(fetchItemDetail("/api/items/item-1")).rejects.toThrow(ApiError);
  });

  it("falls back to a generic message when fetch itself rejects", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchItemDetail("/api/items/item-1")).rejects.toThrow("Failed to load item");
  });

  it("falls back to a generic message when a non-ok response body isn't JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(nonJsonResponse(500, false));

    await expect(fetchItemDetail("/api/items/item-1")).rejects.toThrow("Failed to load item");
  });

  it("throws when the response is ok but success is false", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, true, { success: false, error: "Not authenticated" })
    );

    await expect(fetchItemDetail("/api/items/item-1")).rejects.toThrow("Not authenticated");
  });
});

describe("fetchCollectionOptions", () => {
  it("returns data on success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, true, { success: true, data: [{ id: "col-1", name: "React Patterns" }] })
    );

    await expect(fetchCollectionOptions("/api/collections")).resolves.toEqual([
      { id: "col-1", name: "React Patterns" },
    ]);
  });

  it("throws the server's error message on a non-ok JSON response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(404, false, { success: false, error: "Not found" })
    );

    await expect(fetchCollectionOptions("/api/collections")).rejects.toThrow("Not found");
  });

  it("throws an ApiError on a 401 response", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, false, { success: false }));

    await expect(fetchCollectionOptions("/api/collections")).rejects.toThrow(ApiError);
  });

  it("falls back to a generic message when fetch itself rejects", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchCollectionOptions("/api/collections")).rejects.toThrow(
      "Failed to load collections"
    );
  });

  it("falls back to a generic message when a non-ok response body isn't JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(nonJsonResponse(500, false));

    await expect(fetchCollectionOptions("/api/collections")).rejects.toThrow(
      "Failed to load collections"
    );
  });

  it("throws when the response is ok but success is false", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, true, { success: false, error: "Not authenticated" })
    );

    await expect(fetchCollectionOptions("/api/collections")).rejects.toThrow("Not authenticated");
  });
});

describe("saveCollectionMutation", () => {
  const updateArg = { method: "PATCH" as const, name: "Renamed", description: null };
  const createArg = { method: "POST" as const, name: "New Collection", description: null };

  it("PATCHes the given endpoint with the method stripped from the body, and returns data on success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, true, { success: true, data: { id: "col-1", name: "Renamed" } })
    );

    await expect(
      saveCollectionMutation("/api/collections/col-1", { arg: updateArg })
    ).resolves.toEqual({ id: "col-1", name: "Renamed" });

    expect(fetch).toHaveBeenCalledWith("/api/collections/col-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Renamed", description: null }),
    });
  });

  it("POSTs the given endpoint on create and returns data on success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, true, { success: true, data: { id: "col-2", name: "New Collection" } })
    );

    await expect(
      saveCollectionMutation("/api/collections", { arg: createArg })
    ).resolves.toEqual({ id: "col-2", name: "New Collection" });

    expect(fetch).toHaveBeenCalledWith("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Collection", description: null }),
    });
  });

  it("throws an ApiError on a 401 response", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, false, { success: false }));

    await expect(
      saveCollectionMutation("/api/collections/col-1", { arg: updateArg })
    ).rejects.toThrow(ApiError);
  });

  it("throws the server's error message on a non-ok JSON response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(404, false, { success: false, error: "Collection not found" })
    );

    await expect(
      saveCollectionMutation("/api/collections/col-1", { arg: updateArg })
    ).rejects.toThrow("Collection not found");
  });

  it("falls back to a create-specific generic message when fetch itself rejects on POST", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      saveCollectionMutation("/api/collections", { arg: createArg })
    ).rejects.toThrow("Failed to create collection");
  });

  it("falls back to an update-specific generic message when fetch itself rejects on PATCH", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      saveCollectionMutation("/api/collections/col-1", { arg: updateArg })
    ).rejects.toThrow("Failed to update collection");
  });
});

describe("toggleCollectionFavoriteMutation", () => {
  const arg = { isFavorite: true };

  it("PATCHes the favorite endpoint with the right headers/body and resolves on success", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, true, { success: true }));

    await expect(
      toggleCollectionFavoriteMutation("/api/collections/col-1/favorite", { arg })
    ).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledWith("/api/collections/col-1/favorite", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(arg),
    });
  });

  it("throws an ApiError with the expired-session message and 401 status on a 401 response", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, false, { success: false }));

    await expect(
      toggleCollectionFavoriteMutation("/api/collections/col-1/favorite", { arg })
    ).rejects.toMatchObject({
      message: "Your session has expired. Please sign in again.",
      status: 401,
    });
  });

  it("throws the server's error message on a non-ok JSON response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(404, false, { success: false, error: "Collection not found" })
    );

    await expect(
      toggleCollectionFavoriteMutation("/api/collections/col-1/favorite", { arg })
    ).rejects.toThrow("Collection not found");
  });

  it("falls back to a generic message when fetch itself rejects", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      toggleCollectionFavoriteMutation("/api/collections/col-1/favorite", { arg })
    ).rejects.toThrow("Failed to update favorite");
  });

  it("falls back to a generic message when a non-ok response body isn't JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(nonJsonResponse(500, false));

    await expect(
      toggleCollectionFavoriteMutation("/api/collections/col-1/favorite", { arg })
    ).rejects.toThrow("Failed to update favorite");
  });
});

describe("deleteCollectionMutation", () => {
  it("resolves on success", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, true, { success: true }));

    await expect(deleteCollectionMutation("/api/collections/col-1")).resolves.toBeUndefined();
  });

  it("throws an ApiError on a 401 response", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, false, { success: false }));

    await expect(deleteCollectionMutation("/api/collections/col-1")).rejects.toThrow(ApiError);
  });

  it("throws the server's error message on a non-ok JSON response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(404, false, { success: false, error: "Collection not found" })
    );

    await expect(deleteCollectionMutation("/api/collections/col-1")).rejects.toThrow(
      "Collection not found"
    );
  });

  it("falls back to a generic message when fetch itself rejects", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(deleteCollectionMutation("/api/collections/col-1")).rejects.toThrow(
      "Failed to delete collection"
    );
  });
});
