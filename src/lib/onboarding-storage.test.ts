import { afterEach, describe, expect, it, vi } from "vitest";
import { hasSeenOnboarding, markOnboardingSeen } from "./onboarding-storage";

function fakeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hasSeenOnboarding", () => {
  it("returns false when nothing is stored for the user", () => {
    expect(hasSeenOnboarding("user-1", fakeStorage())).toBe(false);
  });

  it("returns true once the user's flag is set", () => {
    const storage = fakeStorage({ "devstash:onboarding-seen:user-1": "true" });
    expect(hasSeenOnboarding("user-1", storage)).toBe(true);
  });

  it("scopes the flag per user id", () => {
    const storage = fakeStorage({ "devstash:onboarding-seen:user-1": "true" });
    expect(hasSeenOnboarding("user-2", storage)).toBe(false);
  });

  it("treats any stored value other than the exact string \"true\" as unseen", () => {
    const storage = fakeStorage({ "devstash:onboarding-seen:user-1": "false" });
    expect(hasSeenOnboarding("user-1", storage)).toBe(false);
  });

  it("fails to seen (not unseen) when reading storage throws", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("storage disabled");
      }),
    };
    expect(hasSeenOnboarding("user-1", storage)).toBe(true);
  });

  it("falls back to window.localStorage when no storage is passed", () => {
    const storage = fakeStorage({ "devstash:onboarding-seen:user-1": "true" });
    vi.stubGlobal("window", { localStorage: storage });
    expect(hasSeenOnboarding("user-1")).toBe(true);
    expect(storage.getItem).toHaveBeenCalledWith("devstash:onboarding-seen:user-1");
  });

  it("fails to seen when accessing window.localStorage itself throws", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("localStorage disabled");
      },
    });
    expect(hasSeenOnboarding("user-1")).toBe(true);
  });

  it("does not crash when window is undefined entirely (e.g. rendered on the server)", () => {
    expect(() => hasSeenOnboarding("user-1")).not.toThrow();
  });
});

describe("markOnboardingSeen", () => {
  it("persists the flag for the given user id", () => {
    const storage = fakeStorage();
    markOnboardingSeen("user-1", storage);
    expect(storage.setItem).toHaveBeenCalledWith(
      "devstash:onboarding-seen:user-1",
      "true",
    );
  });

  it("swallows a storage write failure instead of throwing", () => {
    const storage = {
      setItem: vi.fn(() => {
        throw new Error("quota exceeded");
      }),
    };
    expect(() => markOnboardingSeen("user-1", storage)).not.toThrow();
  });

  it("falls back to window.localStorage when no storage is passed", () => {
    const storage = fakeStorage();
    vi.stubGlobal("window", { localStorage: storage });
    markOnboardingSeen("user-1");
    expect(storage.setItem).toHaveBeenCalledWith(
      "devstash:onboarding-seen:user-1",
      "true",
    );
  });

  it("does not throw when accessing window.localStorage itself throws", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("localStorage disabled");
      },
    });
    expect(() => markOnboardingSeen("user-1")).not.toThrow();
  });

  it("does not crash when window is undefined entirely (e.g. rendered on the server)", () => {
    expect(() => markOnboardingSeen("user-1")).not.toThrow();
  });
});

describe("markOnboardingSeen + hasSeenOnboarding", () => {
  it("agree on the key format end-to-end: marking a user seen is what hasSeenOnboarding then detects", () => {
    const storage = fakeStorage();

    expect(hasSeenOnboarding("user-1", storage)).toBe(false);
    markOnboardingSeen("user-1", storage);
    expect(hasSeenOnboarding("user-1", storage)).toBe(true);

    // A different user against the same storage instance is unaffected.
    expect(hasSeenOnboarding("user-2", storage)).toBe(false);
  });
});
