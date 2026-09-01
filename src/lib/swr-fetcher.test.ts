import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  deleteCollectionMutation,
  fetchCollectionOptions,
  fetchItemDetail,
  updateCollectionMutation,
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
      jsonResponse(401, false, { success: false, error: "Not authenticated" })
    );

    await expect(fetchCollectionOptions("/api/collections")).rejects.toThrow("Not authenticated");
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

describe("updateCollectionMutation", () => {
  const arg = { name: "Renamed", description: null };

  it("returns data on success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, true, { success: true, data: { id: "col-1", name: "Renamed" } })
    );

    await expect(updateCollectionMutation("/api/collections/col-1", { arg })).resolves.toEqual({
      id: "col-1",
      name: "Renamed",
    });
  });

  it("throws an ApiError on a 401 response", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, false, { success: false }));

    await expect(updateCollectionMutation("/api/collections/col-1", { arg })).rejects.toThrow(ApiError);
  });

  it("throws the server's error message on a non-ok JSON response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(404, false, { success: false, error: "Collection not found" })
    );

    await expect(updateCollectionMutation("/api/collections/col-1", { arg })).rejects.toThrow(
      "Collection not found"
    );
  });

  it("falls back to a generic message when fetch itself rejects", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(updateCollectionMutation("/api/collections/col-1", { arg })).rejects.toThrow(
      "Failed to update collection"
    );
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
