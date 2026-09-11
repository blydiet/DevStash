import { getAppUrl } from "@/lib/app-url";

/**
 * `next/navigation`'s redirect() performs no validation on the URL it's given,
 * unlike next-auth's `signIn({ redirectTo })`, which is checked by the auth
 * config's redirect callback. Any callbackUrl that reaches a raw redirect()
 * call must be validated here first, or it's an open redirect.
 *
 * Callers (proxy.ts's redirect to /sign-in, next-auth's own signout page) pass
 * callbackUrl as an *absolute* URL (`req.nextUrl.href`), not a bare path, so
 * this validates against the app's real trusted origin (getAppUrl()) rather
 * than assuming the input is already relative or using a fake sentinel origin
 * that would never match a real deployment's host/port.
 */
export function getSafeRedirectUrl(url: string | undefined, fallback: string): string {
  if (!url) return fallback;

  let appOrigin: string;
  try {
    appOrigin = new URL(getAppUrl()).origin;
  } catch {
    return fallback;
  }

  try {
    const resolved = new URL(url, appOrigin);
    if (resolved.origin !== appOrigin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Appends `callbackUrl` as a query param on an internal auth-page link (e.g. from
 * /sign-in to /register and back), omitting it entirely when it's just the default,
 * so the common case still gets a clean, undecorated URL.
 */
export function withCallbackUrl(
  path: string,
  callbackUrl: string | undefined,
  defaultCallbackUrl = "/dashboard"
): string {
  if (!callbackUrl || callbackUrl === defaultCallbackUrl) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
