import { describe, it, expect } from "vitest";
import { resolveOAuthProviderLabel } from "@/lib/oauth-provider-label";

describe("resolveOAuthProviderLabel", () => {
  it("returns 'GitHub' for a GitHub-only account", () => {
    expect(resolveOAuthProviderLabel([{ provider: "github" }])).toBe("GitHub");
  });

  it("returns 'Google' for a Google-only account", () => {
    expect(resolveOAuthProviderLabel([{ provider: "google" }])).toBe("Google");
  });

  it("prefers 'GitHub' over 'Google' when both are linked", () => {
    expect(
      resolveOAuthProviderLabel([{ provider: "google" }, { provider: "github" }])
    ).toBe("GitHub");
  });

  it("returns null when no accounts are linked", () => {
    expect(resolveOAuthProviderLabel([])).toBeNull();
  });

  it("returns null when only unrecognized providers are linked", () => {
    expect(resolveOAuthProviderLabel([{ provider: "twitter" }])).toBeNull();
  });
});
