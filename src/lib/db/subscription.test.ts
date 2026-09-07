import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountNotFoundError, getBillingInfo, getOrCreateStripeCustomerId } from "@/lib/db/subscription";

const { getCurrentUserIdMock, prismaMock } = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/user", () => ({
  getCurrentUserId: getCurrentUserIdMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getBillingInfo", () => {
  it("propagates a session failure", async () => {
    getCurrentUserIdMock.mockRejectedValue(new Error("Not authenticated"));
    await expect(getBillingInfo()).rejects.toThrow("Not authenticated");
  });

  it("throws AccountNotFoundError when the session's user row is gone", async () => {
    getCurrentUserIdMock.mockResolvedValue("user-1");
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(getBillingInfo()).rejects.toThrow(AccountNotFoundError);
    await expect(getBillingInfo()).rejects.toThrow("Not authenticated");
  });

  it("maps isPro and currentPeriodEnd for the current user", async () => {
    getCurrentUserIdMock.mockResolvedValue("user-1");
    const periodEnd = new Date("2026-10-01");
    prismaMock.user.findUnique.mockResolvedValue({ isPro: true, stripeCurrentPeriodEnd: periodEnd });

    await expect(getBillingInfo()).resolves.toEqual({ isPro: true, currentPeriodEnd: periodEnd });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { isPro: true, stripeCurrentPeriodEnd: true },
    });
  });
});

describe("getOrCreateStripeCustomerId", () => {
  it("throws AccountNotFoundError when the user row is gone", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const createCustomer = vi.fn();

    await expect(
      getOrCreateStripeCustomerId("user-1", "ada@example.com", createCustomer),
    ).rejects.toThrow(AccountNotFoundError);
    expect(createCustomer).not.toHaveBeenCalled();
  });

  it("returns the existing id as-is without calling createCustomer", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });
    const createCustomer = vi.fn();

    await expect(
      getOrCreateStripeCustomerId("user-1", "ada@example.com", createCustomer),
    ).resolves.toBe("cus_existing");
    expect(createCustomer).not.toHaveBeenCalled();
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it("calls createCustomer once and persists the result when missing", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ stripeCustomerId: null });
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
    const createCustomer = vi.fn().mockResolvedValue("cus_new");

    await expect(
      getOrCreateStripeCustomerId("user-1", "ada@example.com", createCustomer),
    ).resolves.toBe("cus_new");
    expect(createCustomer).toHaveBeenCalledTimes(1);
    expect(createCustomer).toHaveBeenCalledWith("ada@example.com", "user-1");
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", stripeCustomerId: null },
      data: { stripeCustomerId: "cus_new" },
    });
  });

  it("defers to a concurrent winner's id when the guarded update matches no rows", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ stripeCustomerId: null })
      .mockResolvedValueOnce({ stripeCustomerId: "cus_won_the_race" });
    prismaMock.user.updateMany.mockResolvedValue({ count: 0 });
    const createCustomer = vi.fn().mockResolvedValue("cus_lost_the_race");

    await expect(
      getOrCreateStripeCustomerId("user-1", "ada@example.com", createCustomer),
    ).resolves.toBe("cus_won_the_race");
  });

  it("logs and rethrows when createCustomer fails", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: null });
    const err = new Error("Stripe API down");
    const createCustomer = vi.fn().mockRejectedValue(err);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      getOrCreateStripeCustomerId("user-1", "ada@example.com", createCustomer),
    ).rejects.toThrow("Stripe API down");
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
