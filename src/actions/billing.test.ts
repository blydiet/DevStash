import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBillingPortalSession, createCheckoutSession } from "@/actions/billing";

const {
  authMock,
  redirectMock,
  prismaMock,
  getAppUrlMock,
  getOrCreateStripeCustomerIdMock,
  stripeMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
    },
  },
  getAppUrlMock: vi.fn(() => "https://app.example.com"),
  getOrCreateStripeCustomerIdMock: vi.fn(),
  stripeMock: {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/app-url", () => ({ getAppUrl: getAppUrlMock }));
vi.mock("@/lib/db/subscription", () => ({ getOrCreateStripeCustomerId: getOrCreateStripeCustomerIdMock }));
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }));

const SESSION = { user: { id: "user-1", email: "ada@example.com", isPro: false } };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_PRICE_ID_MONTHLY = "price_monthly";
  process.env.STRIPE_PRICE_ID_YEARLY = "price_yearly";
});

describe("createCheckoutSession", () => {
  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);
    await expect(createCheckoutSession("monthly")).resolves.toEqual({
      success: false,
      error: "Not authenticated",
    });
  });

  it("rejects an invalid billing period", async () => {
    authMock.mockResolvedValue(SESSION);
    // @ts-expect-error deliberately invalid input
    await expect(createCheckoutSession("weekly")).resolves.toEqual({
      success: false,
      error: "Invalid billing period",
    });
  });

  it("rejects when the monthly price id env var is missing", async () => {
    authMock.mockResolvedValue(SESSION);
    delete process.env.STRIPE_PRICE_ID_MONTHLY;

    await expect(createCheckoutSession("monthly")).resolves.toEqual({
      success: false,
      error: "Billing is not configured",
    });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects when the yearly price id env var is missing", async () => {
    authMock.mockResolvedValue(SESSION);
    delete process.env.STRIPE_PRICE_ID_YEARLY;

    await expect(createCheckoutSession("yearly")).resolves.toEqual({
      success: false,
      error: "Billing is not configured",
    });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects when the session's user row is gone", async () => {
    authMock.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(createCheckoutSession("monthly")).resolves.toEqual({
      success: false,
      error: "Not authenticated",
    });
    expect(getOrCreateStripeCustomerIdMock).not.toHaveBeenCalled();
  });

  it("sources the customer email from the DB and threads the resulting customer id into the checkout session", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", email: "", isPro: false } });
    prismaMock.user.findUnique.mockResolvedValue({ email: "real@example.com" });
    getOrCreateStripeCustomerIdMock.mockResolvedValue("cus_from_db_email");
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/pay/1" });

    await expect(createCheckoutSession("monthly")).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.com/pay/1"
    );

    expect(getOrCreateStripeCustomerIdMock).toHaveBeenCalledWith(
      "user-1",
      "real@example.com",
      expect.any(Function)
    );
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_from_db_email" })
    );
  });

  it("returns a generic failure when getOrCreateStripeCustomerId throws", async () => {
    authMock.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue({ email: "ada@example.com" });
    getOrCreateStripeCustomerIdMock.mockRejectedValue(new Error("Stripe down"));

    await expect(createCheckoutSession("monthly")).resolves.toEqual({
      success: false,
      error: "Failed to start checkout",
    });
  });

  it("returns a generic failure when Stripe's checkout session create throws", async () => {
    authMock.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue({ email: "ada@example.com" });
    getOrCreateStripeCustomerIdMock.mockResolvedValue("cus_1");
    stripeMock.checkout.sessions.create.mockRejectedValue(new Error("Stripe down"));

    await expect(createCheckoutSession("monthly")).resolves.toEqual({
      success: false,
      error: "Failed to start checkout",
    });
  });

  it("builds the checkout session with the monthly price and redirects to its url", async () => {
    authMock.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue({ email: "ada@example.com" });
    getOrCreateStripeCustomerIdMock.mockResolvedValue("cus_1");
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/pay/1" });

    await expect(createCheckoutSession("monthly")).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.com/pay/1"
    );

    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith({
      customer: "cus_1",
      mode: "subscription",
      line_items: [{ price: "price_monthly", quantity: 1 }],
      success_url: "https://app.example.com/settings?checkout=success",
      cancel_url: "https://app.example.com/settings?checkout=cancelled",
      client_reference_id: "user-1",
      subscription_data: { metadata: { userId: "user-1" } },
    });
  });

  it("builds the checkout session with the yearly price and redirects to its url", async () => {
    authMock.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue({ email: "ada@example.com" });
    getOrCreateStripeCustomerIdMock.mockResolvedValue("cus_1");
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/pay/2" });

    await expect(createCheckoutSession("yearly")).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.com/pay/2"
    );

    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith({
      customer: "cus_1",
      mode: "subscription",
      line_items: [{ price: "price_yearly", quantity: 1 }],
      success_url: "https://app.example.com/settings?checkout=success",
      cancel_url: "https://app.example.com/settings?checkout=cancelled",
      client_reference_id: "user-1",
      subscription_data: { metadata: { userId: "user-1" } },
    });
  });
});

describe("createBillingPortalSession", () => {
  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);
    await expect(createBillingPortalSession()).resolves.toEqual({
      success: false,
      error: "Not authenticated",
    });
  });

  it("rejects when the session's user row is gone", async () => {
    authMock.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(createBillingPortalSession()).resolves.toEqual({
      success: false,
      error: "Not authenticated",
    });
  });

  it("rejects when the user has never subscribed", async () => {
    authMock.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: null });

    await expect(createBillingPortalSession()).resolves.toEqual({
      success: false,
      error: "No billing account found",
    });
  });

  it("returns a generic failure when Stripe's portal session create throws", async () => {
    authMock.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_1" });
    stripeMock.billingPortal.sessions.create.mockRejectedValue(new Error("Stripe down"));

    await expect(createBillingPortalSession()).resolves.toEqual({
      success: false,
      error: "Failed to open billing portal",
    });
  });

  it("builds the portal session with the customer id and return_url, and redirects to its url", async () => {
    authMock.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_1" });
    stripeMock.billingPortal.sessions.create.mockResolvedValue({
      url: "https://billing.stripe.com/session/1",
    });

    await expect(createBillingPortalSession()).rejects.toThrow(
      "REDIRECT:https://billing.stripe.com/session/1"
    );

    expect(stripeMock.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: "cus_1",
      return_url: "https://app.example.com/settings",
    });
  });
});
