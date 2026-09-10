import { beforeEach, describe, expect, it, vi } from "vitest";
import { suggestTags, suggestTagsForDraft, summarizeDraft } from "@/actions/ai";

const { authMock, getItemDetailMock, checkRateLimitMock, rateLimitMessageMock, responsesCreateMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    getItemDetailMock: vi.fn(),
    checkRateLimitMock: vi.fn(),
    rateLimitMessageMock: vi.fn(),
    responsesCreateMock: vi.fn(),
  }));

vi.mock("@/auth", () => ({ auth: authMock }));

vi.mock("@/lib/db/items-queries", () => ({
  getItemDetail: getItemDetailMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  rateLimitMessage: rateLimitMessageMock,
}));

vi.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({ responses: { create: responsesCreateMock } }),
  AI_MODEL: "gpt-5.6-luna",
}));

const PRO_SESSION = { user: { id: "user-1", isPro: true } };
const FREE_SESSION = { user: { id: "user-1", isPro: false } };

const BASE_ITEM = {
  id: "item-1",
  content: "some real content to analyze",
  description: null,
  tags: [] as string[],
};

function mockOpenAiTags(tags: string[]) {
  responsesCreateMock.mockResolvedValue({ output_text: JSON.stringify({ tags }) });
}

function mockOpenAiSummary(description: string) {
  responsesCreateMock.mockResolvedValue({ output_text: JSON.stringify({ description }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  checkRateLimitMock.mockResolvedValue({ success: true, remaining: 19, reset: 0 });
  rateLimitMessageMock.mockReturnValue("Too many attempts. Please try again in 1 minute.");
  getItemDetailMock.mockResolvedValue(BASE_ITEM);
});

describe("suggestTags", () => {
  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);

    await expect(suggestTags("item-1")).resolves.toEqual({
      success: false,
      error: "Not authenticated",
    });
    expect(getItemDetailMock).not.toHaveBeenCalled();
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a free user before touching rate-limit, the item, or OpenAI", async () => {
    authMock.mockResolvedValue(FREE_SESSION);

    await expect(suggestTags("item-1")).resolves.toEqual({
      success: false,
      error: "Upgrade to Pro for AI features.",
      upgradeRequired: true,
    });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(getItemDetailMock).not.toHaveBeenCalled();
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("rejects when the ai-tag rate limit is exceeded, before touching OpenAI", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    checkRateLimitMock.mockResolvedValue({ success: false, remaining: 0, reset: 123 });

    const result = await suggestTags("item-1");

    expect(checkRateLimitMock).toHaveBeenCalledWith("ai-tag", "user-1");
    expect(result).toEqual({
      success: false,
      error: "Too many attempts. Please try again in 1 minute.",
    });
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("rejects when the item doesn't exist or isn't owned by the caller", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    getItemDetailMock.mockResolvedValue(null);

    await expect(suggestTags("item-1")).resolves.toEqual({
      success: false,
      error: "Item not found",
    });
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("rejects when the item has no content or description to analyze", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    getItemDetailMock.mockResolvedValue({ ...BASE_ITEM, content: null, description: "   " });

    await expect(suggestTags("item-1")).resolves.toEqual({
      success: false,
      error: "Nothing to analyze",
    });
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("falls back to description when content is null", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    getItemDetailMock.mockResolvedValue({ ...BASE_ITEM, content: null, description: "a description" });
    mockOpenAiTags(["react"]);

    await suggestTags("item-1");

    const input = responsesCreateMock.mock.calls[0][0].input;
    expect(input[1].content).toBe("a description");
  });

  it("truncates content sent to OpenAI to 4000 characters", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    const longContent = "a".repeat(5000);
    getItemDetailMock.mockResolvedValue({ ...BASE_ITEM, content: longContent });
    mockOpenAiTags(["react"]);

    await suggestTags("item-1");

    const input = responsesCreateMock.mock.calls[0][0].input;
    expect(input[1].content).toHaveLength(4000);
  });

  it("sends the expected model, output cap, and Structured Outputs schema", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    mockOpenAiTags(["react"]);

    await suggestTags("item-1");

    expect(responsesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.6-luna",
        max_output_tokens: 100,
        text: {
          format: {
            type: "json_schema",
            name: "tag_suggestions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                tags: {
                  type: "array",
                  items: { type: "string", maxLength: 30 },
                  maxItems: 5,
                },
              },
              required: ["tags"],
              additionalProperties: false,
            },
          },
        },
      })
    );
  });

  it("normalizes suggested tags: trims, lowercases, and dedupes", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    mockOpenAiTags(["React ", "REACT", " hooks"]);

    const result = await suggestTags("item-1");

    expect(result).toEqual({ success: true, data: { tags: ["react", "hooks"] } });
  });

  it("drops suggestions that already match one of the item's existing tags", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    getItemDetailMock.mockResolvedValue({ ...BASE_ITEM, tags: ["React"] });
    mockOpenAiTags(["react", "hooks"]);

    const result = await suggestTags("item-1");

    expect(result).toEqual({ success: true, data: { tags: ["hooks"] } });
  });

  it("succeeds with an empty tags array when every suggestion is already an existing tag", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    getItemDetailMock.mockResolvedValue({ ...BASE_ITEM, tags: ["react", "hooks"] });
    mockOpenAiTags(["React", "HOOKS"]);

    const result = await suggestTags("item-1");

    expect(result).toEqual({ success: true, data: { tags: [] } });
  });

  it("returns a generic error and logs when the OpenAI call throws", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValue(PRO_SESSION);
    responsesCreateMock.mockRejectedValue(new Error("OpenAI is down"));

    const result = await suggestTags("item-1");

    expect(result).toEqual({ success: false, error: "AI tagging failed. Try again." });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("returns a generic error and logs when the OpenAI response isn't valid JSON", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValue(PRO_SESSION);
    responsesCreateMock.mockResolvedValue({ output_text: "not valid json" });

    const result = await suggestTags("item-1");

    expect(result).toEqual({ success: false, error: "AI tagging failed. Try again." });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe("suggestTagsForDraft", () => {
  it("rejects when there is no session, without touching OpenAI", async () => {
    authMock.mockResolvedValue(null);

    await expect(suggestTagsForDraft("some draft content", [])).resolves.toEqual({
      success: false,
      error: "Not authenticated",
    });
    expect(getItemDetailMock).not.toHaveBeenCalled();
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a free user before touching rate-limit or OpenAI", async () => {
    authMock.mockResolvedValue(FREE_SESSION);

    await expect(suggestTagsForDraft("some draft content", [])).resolves.toEqual({
      success: false,
      error: "Upgrade to Pro for AI features.",
      upgradeRequired: true,
    });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("rejects when the ai-tag rate limit is exceeded, before touching OpenAI", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    checkRateLimitMock.mockResolvedValue({ success: false, remaining: 0, reset: 123 });

    const result = await suggestTagsForDraft("some draft content", []);

    expect(checkRateLimitMock).toHaveBeenCalledWith("ai-tag", "user-1");
    expect(result).toEqual({
      success: false,
      error: "Too many attempts. Please try again in 1 minute.",
    });
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("never touches getItemDetail — it has no item id to look up", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    mockOpenAiTags(["react"]);

    await suggestTagsForDraft("some draft content", []);

    expect(getItemDetailMock).not.toHaveBeenCalled();
  });

  it("rejects blank or whitespace-only draft content", async () => {
    authMock.mockResolvedValue(PRO_SESSION);

    await expect(suggestTagsForDraft("   ", [])).resolves.toEqual({
      success: false,
      error: "Nothing to analyze",
    });
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed existingTags entry via Zod validation, before touching OpenAI", async () => {
    authMock.mockResolvedValue(PRO_SESSION);

    const result = await suggestTagsForDraft("some draft content", ["react", "   "]);

    expect(result.success).toBe(false);
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("truncates draft content sent to OpenAI to 4000 characters", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    mockOpenAiTags(["react"]);

    await suggestTagsForDraft("a".repeat(5000), []);

    const input = responsesCreateMock.mock.calls[0][0].input;
    expect(input[1].content).toHaveLength(4000);
  });

  it("normalizes suggestions and dedupes against the caller-supplied existing tags", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    mockOpenAiTags(["React", "Hooks"]);

    const result = await suggestTagsForDraft("some draft content", ["react"]);

    expect(result).toEqual({ success: true, data: { tags: ["hooks"] } });
  });

  it("returns a generic error and logs when the OpenAI call throws", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValue(PRO_SESSION);
    responsesCreateMock.mockRejectedValue(new Error("OpenAI is down"));

    const result = await suggestTagsForDraft("some draft content", []);

    expect(result).toEqual({ success: false, error: "AI tagging failed. Try again." });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe("summarizeDraft", () => {
  it("rejects when there is no session, without touching OpenAI", async () => {
    authMock.mockResolvedValue(null);

    await expect(summarizeDraft("Title", "content", "")).resolves.toEqual({
      success: false,
      error: "Not authenticated",
    });
    expect(getItemDetailMock).not.toHaveBeenCalled();
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a free user before touching rate-limit or OpenAI", async () => {
    authMock.mockResolvedValue(FREE_SESSION);

    await expect(summarizeDraft("Title", "content", "")).resolves.toEqual({
      success: false,
      error: "Upgrade to Pro for AI features.",
      upgradeRequired: true,
    });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("checks the ai-tag rate-limit scope, keyed by user id, on the success path", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    mockOpenAiSummary("A short description.");

    await summarizeDraft("Title", "content", "");

    expect(checkRateLimitMock).toHaveBeenCalledWith("ai-tag", "user-1");
  });

  it("rejects when the ai-tag rate limit is exceeded, before touching OpenAI", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    checkRateLimitMock.mockResolvedValue({ success: false, remaining: 0, reset: 123 });

    const result = await summarizeDraft("Title", "content", "");

    expect(checkRateLimitMock).toHaveBeenCalledWith("ai-tag", "user-1");
    expect(result).toEqual({
      success: false,
      error: "Too many attempts. Please try again in 1 minute.",
    });
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("never touches getItemDetail — it has no item id to look up", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    mockOpenAiSummary("A short description.");

    await summarizeDraft("Title", "content", "");

    expect(getItemDetailMock).not.toHaveBeenCalled();
  });

  it("rejects when title, content, and url are all blank", async () => {
    authMock.mockResolvedValue(PRO_SESSION);

    await expect(summarizeDraft("   ", "", "  ")).resolves.toEqual({
      success: false,
      error: "Nothing to summarize",
    });
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("summarizes from title alone when content and url are blank (e.g. a fresh file/image draft)", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    mockOpenAiSummary("A short description.");

    const result = await summarizeDraft("Debounce Hook", "", "");

    expect(result).toEqual({ success: true, data: { description: "A short description." } });
    const input = responsesCreateMock.mock.calls[0][0].input;
    expect(input[1].content).toBe("Title: Debounce Hook");
  });

  it("builds the combined input from only the non-blank fields, one per line", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    mockOpenAiSummary("A short description.");

    await summarizeDraft("My Title", "some content", "https://example.com");

    const input = responsesCreateMock.mock.calls[0][0].input;
    expect(input[1].content).toBe(
      "Title: My Title\n\nContent: some content\n\nURL: https://example.com"
    );
  });

  it("truncates a long content field to exactly 3000 characters before concatenation", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    mockOpenAiSummary("A short description.");

    await summarizeDraft("My Title", "a".repeat(5000), "https://example.com");

    const input: string = responsesCreateMock.mock.calls[0][0].input[1].content;
    expect(input).toBe(`Title: My Title\n\nContent: ${"a".repeat(3000)}\n\nURL: https://example.com`);
  });

  it("sends the expected model, output cap, and Structured Outputs schema", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    mockOpenAiSummary("A short description.");

    await summarizeDraft("Title", "content", "");

    expect(responsesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.6-luna",
        max_output_tokens: 150,
        text: {
          format: {
            type: "json_schema",
            name: "description_summary",
            strict: true,
            schema: {
              type: "object",
              properties: {
                description: { type: "string", maxLength: 300 },
              },
              required: ["description"],
              additionalProperties: false,
            },
          },
        },
      })
    );
  });

  it("trims whitespace off the returned description", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    mockOpenAiSummary("  A short description.  ");

    const result = await summarizeDraft("Title", "content", "");

    expect(result).toEqual({ success: true, data: { description: "A short description." } });
  });

  it("returns 'Nothing to summarize' when the model's description is empty after trimming", async () => {
    authMock.mockResolvedValue(PRO_SESSION);
    mockOpenAiSummary("   ");

    const result = await summarizeDraft("Title", "content", "");

    expect(result).toEqual({ success: false, error: "Nothing to summarize" });
  });

  it("returns a generic error and logs when the OpenAI call throws", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValue(PRO_SESSION);
    responsesCreateMock.mockRejectedValue(new Error("OpenAI is down"));

    const result = await summarizeDraft("Title", "content", "");

    expect(result).toEqual({ success: false, error: "AI summary failed. Try again." });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("returns a generic error and logs when the OpenAI response isn't valid JSON", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValue(PRO_SESSION);
    responsesCreateMock.mockResolvedValue({ output_text: "not valid json" });

    const result = await summarizeDraft("Title", "content", "");

    expect(result).toEqual({ success: false, error: "AI summary failed. Try again." });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
