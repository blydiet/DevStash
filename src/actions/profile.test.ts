import { beforeEach, describe, expect, it, vi } from "vitest";
import { changePassword, deleteAccount } from "@/actions/profile";

const { authMock, signOutMock, prismaMock, bcryptMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  signOutMock: vi.fn(),
  prismaMock: {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  bcryptMock: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: authMock,
  signOut: signOutMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("bcryptjs", () => ({
  default: bcryptMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("changePassword", () => {
  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const result = await changePassword("current", "newpassword1", "newpassword1");

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(prismaMock.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("rejects mismatched new passwords via schema validation before touching the DB", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    const result = await changePassword("current", "newpassword1", "different1");

    expect(result.success).toBe(false);
    expect(prismaMock.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("rejects when the account has no password (GitHub-only)", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ id: "user-1", password: null });

    const result = await changePassword("current", "newpassword1", "newpassword1");

    expect(result).toEqual({ success: false, error: "This account doesn't use a password" });
  });

  it("rejects an incorrect current password", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ id: "user-1", password: "hashed" });
    bcryptMock.compare.mockResolvedValue(false);

    const result = await changePassword("wrong-current", "newpassword1", "newpassword1");

    expect(result).toEqual({ success: false, error: "Current password is incorrect" });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("hashes and stores the new password on success", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ id: "user-1", password: "hashed-old" });
    bcryptMock.compare.mockResolvedValue(true);
    bcryptMock.hash.mockResolvedValue("hashed-new");

    const result = await changePassword("current", "newpassword1", "newpassword1");

    expect(result).toEqual({ success: true });
    expect(bcryptMock.hash).toHaveBeenCalledWith("newpassword1", 12);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { password: "hashed-new" },
    });
  });
});

describe("deleteAccount", () => {
  it("no-ops when there is no session", async () => {
    authMock.mockResolvedValue(null);

    await deleteAccount();

    expect(prismaMock.user.delete).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("deletes the user and signs out when a session exists", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    await deleteAccount();

    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/sign-in" });
  });
});
