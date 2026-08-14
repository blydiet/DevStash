import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, getClientIp, rateLimitMessage, retryAfterSeconds } from "@/lib/rate-limit";

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

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
