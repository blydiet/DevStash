import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, getCurrentUserId, getProfileUser } from "@/lib/db/user";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    user: {
      findUniqueOrThrow: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentUserId", () => {
  it("throws when there is no session", async () => {
    authMock.mockResolvedValue(null);
    await expect(getCurrentUserId()).rejects.toThrow("Not authenticated");
  });

  it("returns the session user id", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    await expect(getCurrentUserId()).resolves.toBe("user-1");
  });
});

describe("getCurrentUser", () => {
  it("throws when there is no session", async () => {
    authMock.mockResolvedValue(null);
    await expect(getCurrentUser()).rejects.toThrow("Not authenticated");
  });

  it("uses the session name when present", async () => {
    authMock.mockResolvedValue({
      user: { name: "Ada Lovelace", email: "ada@example.com", image: null },
    });
    await expect(getCurrentUser()).resolves.toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      image: null,
    });
  });

  it("falls back to email when name is missing", async () => {
    authMock.mockResolvedValue({ user: { name: null, email: "ada@example.com", image: null } });
    await expect(getCurrentUser()).resolves.toMatchObject({ name: "ada@example.com" });
  });

  it("falls back to 'User' when both name and email are missing", async () => {
    authMock.mockResolvedValue({ user: { name: null, email: null, image: null } });
    await expect(getCurrentUser()).resolves.toMatchObject({ name: "User", email: "" });
  });
});

describe("getProfileUser", () => {
  it("throws when there is no session", async () => {
    authMock.mockResolvedValue(null);
    await expect(getProfileUser()).rejects.toThrow("Not authenticated");
  });

  it("reports authProvider 'github' when a GitHub account is linked", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      name: "Ada",
      email: "ada@example.com",
      image: null,
      createdAt: new Date("2026-01-01"),
      password: "hashed",
      accounts: [{ provider: "github" }],
    });

    const result = await getProfileUser();

    expect(result.authProvider).toBe("github");
    expect(result.hasPassword).toBe(true);
  });

  it("reports authProvider 'credentials' and hasPassword false for a GitHub-only account with no accounts row matching", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      name: null,
      email: "ada@example.com",
      image: null,
      createdAt: new Date("2026-01-01"),
      password: null,
      accounts: [],
    });

    const result = await getProfileUser();

    expect(result.authProvider).toBe("credentials");
    expect(result.hasPassword).toBe(false);
    expect(result.name).toBe("ada@example.com");
  });
});
