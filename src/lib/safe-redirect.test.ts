import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSafeRedirectUrl, withCallbackUrl } from "@/lib/safe-redirect";

const originalAppUrl = process.env.APP_URL;
const originalVercelBranchUrl = process.env.VERCEL_BRANCH_URL;

describe("getSafeRedirectUrl", () => {
  beforeEach(() => {
    // Matches this project's real dev APP_URL, including the port -- the whole point
    // of this function is validating against the app's real origin, so tests must use
    // a real-shaped origin rather than a fake unrelated sentinel.
    process.env.APP_URL = "http://localhost:3000";
    delete process.env.VERCEL_BRANCH_URL;
  });

  afterEach(() => {
    process.env.APP_URL = originalAppUrl;
    process.env.VERCEL_BRANCH_URL = originalVercelBranchUrl;
  });

  it("returns the fallback when no url is given", () => {
    expect(getSafeRedirectUrl(undefined, "/dashboard")).toBe("/dashboard");
  });

  it("allows a same-origin relative path", () => {
    expect(getSafeRedirectUrl("/items/snippet", "/dashboard")).toBe("/items/snippet");
  });

  it("preserves query string and hash on a same-origin path", () => {
    expect(getSafeRedirectUrl("/items/snippet?page=2#top", "/dashboard")).toBe(
      "/items/snippet?page=2#top"
    );
  });

  it("strips the origin from an absolute same-origin URL (the real proxy.ts/next-auth shape)", () => {
    // proxy.ts sets callbackUrl to req.nextUrl.href (absolute), and next-auth's own
    // signout confirmation page does the same -- this is the primary real-world input,
    // not an edge case.
    expect(getSafeRedirectUrl("http://localhost:3000/items/snippet", "/dashboard")).toBe(
      "/items/snippet"
    );
  });

  it("resolves an absolute same-origin URL with no path to the root path", () => {
    expect(getSafeRedirectUrl("http://localhost:3000", "/dashboard")).toBe("/");
  });

  it("falls back on an absolute cross-origin URL", () => {
    expect(getSafeRedirectUrl("https://evil.com/phish", "/dashboard")).toBe("/dashboard");
  });

  it("falls back on a same-hostname URL with a different port", () => {
    // http://localhost (implicit port 80) is NOT the same origin as
    // http://localhost:3000 -- a mismatched port must be rejected like any
    // other cross-origin URL, not treated as "close enough."
    expect(getSafeRedirectUrl("http://localhost/admin", "/dashboard")).toBe("/dashboard");
  });

  it("falls back on a protocol-relative URL", () => {
    expect(getSafeRedirectUrl("//evil.com", "/dashboard")).toBe("/dashboard");
  });

  it("falls back on a backslash-based protocol-relative URL", () => {
    expect(getSafeRedirectUrl("/\\evil.com", "/dashboard")).toBe("/dashboard");
  });

  it("falls back on a non-http scheme", () => {
    expect(getSafeRedirectUrl("javascript:alert(1)", "/dashboard")).toBe("/dashboard");
  });

  it("falls back on a host that merely starts with the allowed hostname", () => {
    expect(getSafeRedirectUrl("http://localhost.evil.com", "/dashboard")).toBe("/dashboard");
  });

  it("falls back on userinfo-based host confusion using the allowed hostname", () => {
    expect(getSafeRedirectUrl("http://localhost:3000@evil.com", "/dashboard")).toBe(
      "/dashboard"
    );
  });

  it("falls back on userinfo-based host confusion using a plausible-looking word", () => {
    // e.g. a link that reads like it points at "dashboard" but the real host is evil.com --
    // .origin excludes userinfo, so this must resolve to evil.com's origin, not match.
    expect(getSafeRedirectUrl("https://dashboard@evil.com/", "/dashboard")).toBe("/dashboard");
  });

  it("falls back on a protocol-relative URL prefixed with a leading space", () => {
    // The WHATWG URL parser strips leading C0-control-or-space before parsing, same as
    // a real browser would -- so this must normalize to "//evil.com" and get rejected,
    // not slip through as if the leading space made it "not protocol-relative."
    expect(getSafeRedirectUrl(" //evil.com", "/dashboard")).toBe("/dashboard");
  });

  it("falls back on a protocol-relative URL prefixed with a tab", () => {
    // Tabs/newlines are stripped throughout the string per the URL spec, not just at
    // the edges -- confirms the parser (and this check) sees "//evil.com" underneath.
    expect(getSafeRedirectUrl("\t//evil.com", "/dashboard")).toBe("/dashboard");
  });

  it("falls back on a protocol-relative URL prefixed with a NUL byte", () => {
    const nulPrefixed = String.fromCharCode(0) + "//evil.com";
    expect(getSafeRedirectUrl(nulPrefixed, "/dashboard")).toBe("/dashboard");
  });

  it("falls back on an unparseable value", () => {
    expect(getSafeRedirectUrl("http://", "/dashboard")).toBe("/dashboard");
  });

  it("falls back gracefully (fails closed) when APP_URL/VERCEL_BRANCH_URL are both unset", () => {
    delete process.env.APP_URL;
    delete process.env.VERCEL_BRANCH_URL;
    // getAppUrl() throws here -- getSafeRedirectUrl must catch that and fall back
    // rather than letting a misconfigured env crash a public auth page.
    expect(getSafeRedirectUrl("/items/snippet", "/dashboard")).toBe("/dashboard");
  });

  it("validates against the VERCEL_BRANCH_URL origin when APP_URL is unset", () => {
    // getAppUrl() falls back to VERCEL_BRANCH_URL (preview/branch deploys) and prepends
    // "https://" itself, since Vercel provides it as a bare host. Confirms
    // getSafeRedirectUrl actually validates against *that* resolved origin (and that
    // the bare-host-to-https:// step upstream doesn't break this function).
    delete process.env.APP_URL;
    process.env.VERCEL_BRANCH_URL = "my-site-git-branch.vercel.app";

    expect(
      getSafeRedirectUrl(
        "https://my-site-git-branch.vercel.app/items/snippet",
        "/dashboard"
      )
    ).toBe("/items/snippet");

    // A URL matching neither VERCEL_BRANCH_URL's origin nor any other trusted origin
    // must still be rejected in this branch-deploy configuration too.
    expect(getSafeRedirectUrl("https://evil.com/phish", "/dashboard")).toBe("/dashboard");
  });

  it("validates against APP_URL's origin (not VERCEL_BRANCH_URL's) when both are set", () => {
    // getAppUrl() prefers APP_URL over VERCEL_BRANCH_URL when both are set (see
    // app-url.test.ts). If that precedence were ever silently flipped by a refactor,
    // this must catch it: a URL matching the *unused* source's origin should still
    // be rejected, not accepted as if it were also trusted.
    process.env.APP_URL = "http://localhost:3000";
    process.env.VERCEL_BRANCH_URL = "my-site-git-branch.vercel.app";

    expect(getSafeRedirectUrl("http://localhost:3000/items/snippet", "/dashboard")).toBe(
      "/items/snippet"
    );
    expect(
      getSafeRedirectUrl(
        "https://my-site-git-branch.vercel.app/items/snippet",
        "/dashboard"
      )
    ).toBe("/dashboard");
  });
});

describe("withCallbackUrl", () => {
  it("returns the bare path when callbackUrl is undefined", () => {
    expect(withCallbackUrl("/register", undefined)).toBe("/register");
  });

  it("returns the bare path when callbackUrl is an empty string", () => {
    // "" is falsy, same branch as undefined -- must not produce "?callbackUrl=".
    expect(withCallbackUrl("/register", "")).toBe("/register");
  });

  it("omits the query param when callbackUrl matches the default", () => {
    expect(withCallbackUrl("/register", "/dashboard")).toBe("/register");
  });

  it("appends an encoded callbackUrl when it differs from the default", () => {
    expect(withCallbackUrl("/register", "/items/snippet")).toBe(
      "/register?callbackUrl=%2Fitems%2Fsnippet"
    );
  });

  it("encodes special characters in the callbackUrl", () => {
    expect(withCallbackUrl("/register", "/items/snippet?page=2")).toBe(
      "/register?callbackUrl=%2Fitems%2Fsnippet%3Fpage%3D2"
    );
  });

  it("respects a custom defaultCallbackUrl", () => {
    expect(withCallbackUrl("/sign-in", "/settings", "/settings")).toBe("/sign-in");
    expect(withCallbackUrl("/sign-in", "/dashboard", "/settings")).toBe(
      "/sign-in?callbackUrl=%2Fdashboard"
    );
  });

  it("uses & instead of ? when the base path already has a query string", () => {
    expect(withCallbackUrl("/register?ref=email", "/items/snippet")).toBe(
      "/register?ref=email&callbackUrl=%2Fitems%2Fsnippet"
    );
  });
});

describe("withCallbackUrl + getSafeRedirectUrl round trip", () => {
  beforeEach(() => {
    process.env.APP_URL = "http://localhost:3000";
    delete process.env.VERCEL_BRANCH_URL;
  });

  afterEach(() => {
    process.env.APP_URL = originalAppUrl;
    process.env.VERCEL_BRANCH_URL = originalVercelBranchUrl;
  });

  // The real flow: /sign-in builds a /register link via withCallbackUrl, the browser
  // navigates there, and /register's searchParams.callbackUrl is later validated via
  // getSafeRedirectUrl before use. Confirms the two functions actually compose.
  function roundTrip(builtHref: string): string | undefined {
    const parsed = new URL(builtHref, "http://localhost:3000");
    return parsed.searchParams.get("callbackUrl") ?? undefined;
  }

  it("preserves a safe relative path end-to-end", () => {
    const href = withCallbackUrl("/register", "/items/snippet");
    expect(getSafeRedirectUrl(roundTrip(href), "/dashboard")).toBe("/items/snippet");
  });

  it("still falls back to the default if a malicious value reaches the query string directly", () => {
    // Simulates an attacker constructing the URL by hand rather than via withCallbackUrl --
    // getSafeRedirectUrl is the actual safety boundary, not withCallbackUrl.
    const tampered = `/register?callbackUrl=${encodeURIComponent("https://evil.com")}`;
    expect(getSafeRedirectUrl(roundTrip(tampered), "/dashboard")).toBe("/dashboard");
  });
});
