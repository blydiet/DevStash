import { afterEach, describe, expect, it, vi } from "vitest";
import { isEmailVerificationEnabled } from "@/lib/feature-flags";

describe("isEmailVerificationEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is enabled by default when the env var is unset", () => {
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", undefined);
    expect(isEmailVerificationEnabled()).toBe(true);
  });

  it("is disabled only when explicitly set to the string 'false'", () => {
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "false");
    expect(isEmailVerificationEnabled()).toBe(false);
  });

  it("is enabled for any other value", () => {
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "true");
    expect(isEmailVerificationEnabled()).toBe(true);
  });
});
