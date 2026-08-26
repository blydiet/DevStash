import { afterEach, describe, expect, it } from "vitest";
import { getAppUrl } from "@/lib/app-url";

const originalAppUrl = process.env.APP_URL;
const originalVercelBranchUrl = process.env.VERCEL_BRANCH_URL;

afterEach(() => {
  process.env.APP_URL = originalAppUrl;
  process.env.VERCEL_BRANCH_URL = originalVercelBranchUrl;
});

describe("getAppUrl", () => {
  it("returns the configured APP_URL", () => {
    process.env.APP_URL = "https://devstash.io";

    expect(getAppUrl()).toBe("https://devstash.io");
  });

  it("prefers APP_URL over VERCEL_BRANCH_URL when both are set", () => {
    process.env.APP_URL = "https://devstash.io";
    process.env.VERCEL_BRANCH_URL = "my-site-git-branch.vercel.app";

    expect(getAppUrl()).toBe("https://devstash.io");
  });

  it("falls back to VERCEL_BRANCH_URL when APP_URL is not set", () => {
    delete process.env.APP_URL;
    process.env.VERCEL_BRANCH_URL = "my-site-git-branch.vercel.app";

    expect(getAppUrl()).toBe("https://my-site-git-branch.vercel.app");
  });

  it("throws when neither APP_URL nor VERCEL_BRANCH_URL is set", () => {
    delete process.env.APP_URL;
    delete process.env.VERCEL_BRANCH_URL;

    expect(() => getAppUrl()).toThrow("APP_URL is not set");
  });
});
