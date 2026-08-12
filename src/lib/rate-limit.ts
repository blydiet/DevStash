import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

export type RateLimitScope =
  | "sign-in"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "resend-verification";

const LIMITS: Record<RateLimitScope, { requests: number; window: `${number} ${"m" | "h"}` }> = {
  "sign-in": { requests: 5, window: "15 m" },
  register: { requests: 3, window: "1 h" },
  "forgot-password": { requests: 3, window: "1 h" },
  "reset-password": { requests: 5, window: "15 m" },
  "resend-verification": { requests: 3, window: "15 m" },
};

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const limiters = new Map<RateLimitScope, Ratelimit>();

function getLimiter(scope: RateLimitScope): Ratelimit | null {
  if (!redis) return null;

  const existing = limiters.get(scope);
  if (existing) return existing;

  const { requests, window } = LIMITS[scope];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `devstash:ratelimit:${scope}`,
  });
  limiters.set(scope, limiter);
  return limiter;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Fails open: if Upstash isn't configured or the request to it fails, the
 * caller is allowed through rather than being locked out.
 */
export async function checkRateLimit(
  scope: RateLimitScope,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = getLimiter(scope);

  if (!limiter) {
    return { success: true, remaining: LIMITS[scope].requests, reset: 0 };
  }

  try {
    const result = await limiter.limit(identifier);
    return { success: result.success, remaining: result.remaining, reset: result.reset };
  } catch (err) {
    console.error(`Rate limit check failed for scope "${scope}":`, err);
    return { success: true, remaining: LIMITS[scope].requests, reset: 0 };
  }
}

// Trusting the first entry only holds because Vercel overwrites x-forwarded-for
// rather than appending to a client-supplied value (unless Enterprise's optional
// trusted-proxy feature is enabled, which this project doesn't use). Off Vercel,
// this header is client-controlled and must not be trusted for rate-limit keys.
export async function getClientIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "unknown";
}

export function rateLimitMessage(reset: number): string {
  const minutes = Math.max(1, Math.ceil((reset - Date.now()) / 60_000));
  return `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export function retryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}
