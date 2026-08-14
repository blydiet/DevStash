import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeVerificationToken,
  createVerificationToken,
  peekVerificationToken,
} from "@/lib/db/verification-tokens";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createVerificationToken", () => {
  it("namespaces the identifier by purpose, clears prior tokens, and stores a hashed token", async () => {
    const rawToken = await createVerificationToken("password-reset", "user@example.com");

    expect(rawToken).toMatch(/^[0-9a-f]{64}$/);
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "password-reset:user@example.com" },
    });

    const createArgs = prismaMock.verificationToken.create.mock.calls[0][0];
    expect(createArgs.data.identifier).toBe("password-reset:user@example.com");
    expect(createArgs.data.token).not.toBe(rawToken);
    expect(createArgs.data.token).toMatch(/^[0-9a-f]{64}$/);
    expect(createArgs.data.expires.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("peekVerificationToken", () => {
  it("is invalid when no record matches the token", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue(null);

    const result = await peekVerificationToken("email-verification", "does-not-exist");

    expect(result).toEqual({ valid: false, reason: "invalid" });
    expect(prismaMock.verificationToken.delete).not.toHaveBeenCalled();
  });

  it("is invalid when the record belongs to a different purpose", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: "password-reset:user@example.com",
      expires: new Date(Date.now() + 10_000),
    });

    const result = await peekVerificationToken("email-verification", "some-token");

    expect(result).toEqual({ valid: false, reason: "invalid" });
  });

  it("reports expired for a matching-purpose token past its expiry", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: "email-verification:user@example.com",
      expires: new Date(Date.now() - 1_000),
    });

    const result = await peekVerificationToken("email-verification", "some-token");

    expect(result).toEqual({ valid: false, reason: "expired", email: "user@example.com" });
    expect(prismaMock.verificationToken.delete).not.toHaveBeenCalled();
  });

  it("is valid for a matching-purpose, unexpired token and never mutates it", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: "email-verification:user@example.com",
      expires: new Date(Date.now() + 10_000),
    });

    const result = await peekVerificationToken("email-verification", "some-token");

    expect(result).toEqual({ valid: true, email: "user@example.com" });
    expect(prismaMock.verificationToken.delete).not.toHaveBeenCalled();
  });
});

describe("consumeVerificationToken", () => {
  it("is invalid without deleting anything when no record matches", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue(null);

    const result = await consumeVerificationToken("email-verification", "does-not-exist");

    expect(result).toEqual({ success: false, error: "invalid" });
    expect(prismaMock.verificationToken.delete).not.toHaveBeenCalled();
  });

  it("is invalid without deleting anything when the purpose doesn't match", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: "password-reset:user@example.com",
      expires: new Date(Date.now() + 10_000),
    });

    const result = await consumeVerificationToken("email-verification", "some-token");

    expect(result).toEqual({ success: false, error: "invalid" });
    expect(prismaMock.verificationToken.delete).not.toHaveBeenCalled();
  });

  it("deletes and succeeds for a matching-purpose, unexpired token", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: "email-verification:user@example.com",
      expires: new Date(Date.now() + 10_000),
    });

    const result = await consumeVerificationToken("email-verification", "some-token");

    expect(result).toEqual({ success: true, email: "user@example.com" });
    expect(prismaMock.verificationToken.delete).toHaveBeenCalledOnce();
  });

  it("is single-use: deletes an expired token too, but reports it as expired", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: "email-verification:user@example.com",
      expires: new Date(Date.now() - 10_000),
    });

    const result = await consumeVerificationToken("email-verification", "some-token");

    expect(result).toEqual({ success: false, error: "expired", email: "user@example.com" });
    expect(prismaMock.verificationToken.delete).toHaveBeenCalledOnce();
  });
});
