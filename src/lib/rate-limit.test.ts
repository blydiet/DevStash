import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, getClientIp, rateLimitMessage, retryAfterSeconds } from "@/lib/rate-limit";

const { headersMock, limitMock, RatelimitMock, RedisMock } = vi.hoisted(() => {
  const limitMock = vi.fn();
  const RatelimitMock = Object.assign(
    vi.fn().mockImplementation(function RatelimitMock(this: { limit: typeof limitMock }) {
      this.limit = limitMock;
    }),
    { slidingWindow: vi.fn() }
  );
  return {
    headersMock: vi.fn(),
    limitMock,
    RatelimitMock,
    RedisMock: vi.fn().mockImplementation(function RedisMock() {}),
  };
});

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@upstash/ratelimit", () => ({ Ratelimit: RatelimitMock }));
vi.mock("@upstash/redis", () => ({ Redis: RedisMock }));

describe("getClientIp", () => {
  it("returns the first IP from a comma-separated x-forwarded-for header", async () => {
    headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }));
    await expect(getClientIp()).resolves.toBe("1.2.3.4");
  });

  it("falls back to 'unknown' when the header is absent", async () => {
    headersMock.mockResolvedValue(new Headers());
    await expect(getClientIp()).resolves.toBe("unknown");
  });
});

describe("rateLimitMessage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rounds up to the nearest whole minute", () => {
    const reset = Date.now() + 90_000; // 1.5 minutes away
    expect(rateLimitMessage(reset)).toBe("Too many attempts. Please try again in 2 minutes.");
  });

  it("uses singular 'minute' for exactly one minute", () => {
    const reset = Date.now() + 60_000;
    expect(rateLimitMessage(reset)).toBe("Too many attempts. Please try again in 1 minute.");
  });

  it("floors at 1 minute even if reset is in the past", () => {
    const reset = Date.now() - 10_000;
    expect(rateLimitMessage(reset)).toBe("Too many attempts. Please try again in 1 minute.");
  });
});

describe("retryAfterSeconds", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rounds up to the nearest whole second", () => {
    expect(retryAfterSeconds(Date.now() + 10_500)).toBe(11);
  });

  it("floors at 1 second even if reset is in the past", () => {
    expect(retryAfterSeconds(Date.now() - 5_000)).toBe(1);
  });
});

describe("checkRateLimit", () => {
  it("fails open with the scope's full quota when Upstash isn't configured", async () => {
    const result = await checkRateLimit("sign-in", "1.2.3.4:test@example.com");
    expect(result).toEqual({ success: true, remaining: 5, reset: 0 });
  });
});

// The `redis` client and `limiters` cache in rate-limit.ts are module-level
// state computed from env vars present at import time, so exercising the
// "Upstash is configured but the check itself throws" path requires a fresh
// module instance with the env vars set beforehand — hence vi.resetModules()
// + a dynamic re-import, isolated to this describe block. The other
// describe blocks above keep using the file's original static import
// (module-cached with no Upstash env vars set), so they're unaffected.
describe("checkRateLimit — configured limiter throws", () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://upstash.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    limitMock.mockRejectedValue(new Error("upstash down"));
  });

  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    vi.resetModules();
  });

  it("fails closed (blocks the caller) for the ai-tag scope", async () => {
    vi.resetModules();
    const { checkRateLimit: freshCheckRateLimit } = await import("@/lib/rate-limit");

    const result = await freshCheckRateLimit("ai", "user-1");

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("still fails open for a non-AI scope", async () => {
    vi.resetModules();
    const { checkRateLimit: freshCheckRateLimit } = await import("@/lib/rate-limit");

    const result = await freshCheckRateLimit("sign-in", "1.2.3.4");

    expect(result.success).toBe(true);
  });
});
