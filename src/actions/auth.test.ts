import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  confirmEmailVerification,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  signInWithCredentials,
} from "@/actions/auth";

const {
  signInMock,
  AuthError,
  EmailNotVerifiedError,
  RateLimitedError,
  GitHubOnlyAccountError,
  redirectMock,
  prismaMock,
  sendVerificationEmailMock,
  sendPasswordResetEmailMock,
  consumeVerificationTokenMock,
  isEmailVerificationEnabledMock,
  checkRateLimitMock,
  getClientIpMock,
  rateLimitMessageMock,
  bcryptMock,
} = vi.hoisted(() => {
  class EmailNotVerifiedError extends Error {
    code = "email-not-verified";
  }
  class RateLimitedError extends Error {
    code = "rate-limited";
    reset: number;
    constructor(reset: number) {
      super();
      this.reset = reset;
    }
  }
  class GitHubOnlyAccountError extends Error {
    code = "github-only-account";
  }
  class AuthError extends Error {}
  return {
    signInMock: vi.fn(),
    AuthError,
    EmailNotVerifiedError,
    RateLimitedError,
    GitHubOnlyAccountError,
    redirectMock: vi.fn((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    }),
    prismaMock: {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
    sendVerificationEmailMock: vi.fn(),
    sendPasswordResetEmailMock: vi.fn(),
    consumeVerificationTokenMock: vi.fn(),
    isEmailVerificationEnabledMock: vi.fn(),
    checkRateLimitMock: vi.fn(),
    getClientIpMock: vi.fn(),
    rateLimitMessageMock: vi.fn(),
    bcryptMock: { hash: vi.fn() },
  };
});

vi.mock("@/auth", () => ({
  signIn: signInMock,
  signOut: vi.fn(),
  EmailNotVerifiedError,
  RateLimitedError,
  GitHubOnlyAccountError,
}));

vi.mock("next-auth", () => ({
  AuthError,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/email", () => ({
  sendVerificationEmail: sendVerificationEmailMock,
  sendPasswordResetEmail: sendPasswordResetEmailMock,
}));

vi.mock("@/lib/db/verification-tokens", () => ({
  consumeVerificationToken: consumeVerificationTokenMock,
}));

vi.mock("@/lib/feature-flags", () => ({
  isEmailVerificationEnabled: isEmailVerificationEnabledMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIp: getClientIpMock,
  rateLimitMessage: rateLimitMessageMock,
}));

vi.mock("bcryptjs", () => ({
  default: bcryptMock,
}));

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_URL = "http://devstash.io";
  getClientIpMock.mockResolvedValue("1.2.3.4");
  checkRateLimitMock.mockResolvedValue({ success: true, remaining: 5, reset: 0 });
  isEmailVerificationEnabledMock.mockReturnValue(true);
});

describe("signInWithCredentials", () => {
  it("returns a validation error without calling signIn for invalid input", async () => {
    const result = await signInWithCredentials(
      { success: false },
      formData({ email: "not-an-email", password: "x" })
    );

    expect(result.success).toBe(false);
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("succeeds when signIn resolves", async () => {
    signInMock.mockResolvedValue(undefined);

    const result = await signInWithCredentials(
      { success: false },
      formData({ email: "a@b.com", password: "secret" })
    );

    expect(result).toEqual({ success: true });
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "a@b.com",
      password: "secret",
      redirectTo: "/dashboard",
    });
  });

  it("maps RateLimitedError to a rate-limit message", async () => {
    signInMock.mockRejectedValue(new RateLimitedError(123456));
    rateLimitMessageMock.mockReturnValue("Too many attempts. Try again later.");

    const result = await signInWithCredentials(
      { success: false },
      formData({ email: "a@b.com", password: "secret" })
    );

    expect(result).toEqual({ success: false, error: "Too many attempts. Try again later." });
    expect(rateLimitMessageMock).toHaveBeenCalledWith(123456);
  });

  it("maps EmailNotVerifiedError to the unverified branch", async () => {
    signInMock.mockRejectedValue(new EmailNotVerifiedError());

    const result = await signInWithCredentials(
      { success: false },
      formData({ email: "a@b.com", password: "secret" })
    );

    expect(result).toEqual({
      success: false,
      error: "Please verify your email before signing in.",
      unverified: true,
      email: "a@b.com",
    });
  });

  it("maps GitHubOnlyAccountError to a distinct message", async () => {
    signInMock.mockRejectedValue(new GitHubOnlyAccountError());

    const result = await signInWithCredentials(
      { success: false },
      formData({ email: "a@b.com", password: "secret" })
    );

    expect(result).toEqual({
      success: false,
      error: "This account uses GitHub — sign in with GitHub instead.",
    });
  });

  it("maps a generic AuthError to a generic invalid-credentials message", async () => {
    signInMock.mockRejectedValue(new AuthError("bad credentials"));

    const result = await signInWithCredentials(
      { success: false },
      formData({ email: "a@b.com", password: "secret" })
    );

    expect(result).toEqual({ success: false, error: "Invalid email or password" });
  });

  it("rethrows unrecognized errors", async () => {
    signInMock.mockRejectedValue(new Error("boom"));

    await expect(
      signInWithCredentials({ success: false }, formData({ email: "a@b.com", password: "secret" }))
    ).rejects.toThrow("boom");
  });
});

describe("resendVerificationEmail", () => {
  it("no-ops successfully when the feature flag is disabled", async () => {
    isEmailVerificationEnabledMock.mockReturnValue(false);

    const result = await resendVerificationEmail("a@b.com");

    expect(result).toEqual({ success: true });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("returns a rate-limit error when over the limit", async () => {
    checkRateLimitMock.mockResolvedValue({ success: false, remaining: 0, reset: 999 });
    rateLimitMessageMock.mockReturnValue("Slow down.");

    const result = await resendVerificationEmail("a@b.com");

    expect(result).toEqual({ success: false, error: "Slow down." });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("silently succeeds for an unknown email without sending anything", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await resendVerificationEmail("unknown@b.com");

    expect(result).toEqual({ success: true });
    expect(sendVerificationEmailMock).not.toHaveBeenCalled();
  });

  it("silently succeeds for a GitHub-only account without sending anything", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ password: null, emailVerified: null });

    const result = await resendVerificationEmail("github-user@b.com");

    expect(result).toEqual({ success: true });
    expect(sendVerificationEmailMock).not.toHaveBeenCalled();
  });

  it("silently succeeds for an already-verified account without sending anything", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ password: "hash", emailVerified: new Date() });

    const result = await resendVerificationEmail("verified@b.com");

    expect(result).toEqual({ success: true });
    expect(sendVerificationEmailMock).not.toHaveBeenCalled();
  });

  it("sends the email for an unverified credentials account", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ password: "hash", emailVerified: null });
    sendVerificationEmailMock.mockResolvedValue(undefined);

    const result = await resendVerificationEmail("unverified@b.com");

    expect(result).toEqual({ success: true });
    expect(sendVerificationEmailMock).toHaveBeenCalledWith("unverified@b.com", "http://devstash.io");
  });

  it("reports a friendly error when sending fails", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ password: "hash", emailVerified: null });
    sendVerificationEmailMock.mockRejectedValue(new Error("Resend down"));

    const result = await resendVerificationEmail("unverified@b.com");

    expect(result).toEqual({
      success: false,
      error: "Couldn't send the email. Try again in a moment.",
    });
  });
});

describe("confirmEmailVerification", () => {
  it("marks the user verified and redirects to success on a valid token", async () => {
    consumeVerificationTokenMock.mockResolvedValue({ success: true, email: "a@b.com" });

    await expect(confirmEmailVerification("raw-token")).rejects.toThrow(
      "REDIRECT:/verify-email?status=success"
    );

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { email: "a@b.com" },
      data: { emailVerified: expect.any(Date) },
    });
  });

  it("redirects to invalid without touching the user on a bad token", async () => {
    consumeVerificationTokenMock.mockResolvedValue({ success: false, error: "invalid" });

    await expect(confirmEmailVerification("raw-token")).rejects.toThrow(
      "REDIRECT:/verify-email?status=invalid"
    );

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

describe("requestPasswordReset", () => {
  it("returns a validation error for an invalid email", async () => {
    const result = await requestPasswordReset("not-an-email");

    expect(result.success).toBe(false);
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("returns a rate-limit error when over the limit", async () => {
    checkRateLimitMock.mockResolvedValue({ success: false, remaining: 0, reset: 999 });
    rateLimitMessageMock.mockReturnValue("Slow down.");

    const result = await requestPasswordReset("a@b.com");

    expect(result).toEqual({ success: false, error: "Slow down." });
  });

  it("silently succeeds for a GitHub-only or unknown account", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ password: null });

    const result = await requestPasswordReset("a@b.com");

    expect(result).toEqual({ success: true });
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it("sends the reset email for a credentials account", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ password: "hash" });
    sendPasswordResetEmailMock.mockResolvedValue(undefined);

    const result = await requestPasswordReset("a@b.com");

    expect(result).toEqual({ success: true });
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith("a@b.com", "http://devstash.io");
  });
});

describe("resetPassword", () => {
  it("returns a validation error for mismatched passwords without checking the token", async () => {
    const result = await resetPassword(
      "raw-token",
      { success: false },
      formData({ password: "password1", confirmPassword: "different1" })
    );

    expect(result.success).toBe(false);
    expect(consumeVerificationTokenMock).not.toHaveBeenCalled();
  });

  it("returns a rate-limit error when over the limit", async () => {
    checkRateLimitMock.mockResolvedValue({ success: false, remaining: 0, reset: 999 });
    rateLimitMessageMock.mockReturnValue("Slow down.");

    const result = await resetPassword(
      "raw-token",
      { success: false },
      formData({ password: "password1", confirmPassword: "password1" })
    );

    expect(result).toEqual({ success: false, error: "Slow down." });
  });

  it("returns an error for an invalid or expired token", async () => {
    consumeVerificationTokenMock.mockResolvedValue({ success: false, error: "invalid" });

    const result = await resetPassword(
      "raw-token",
      { success: false },
      formData({ password: "password1", confirmPassword: "password1" })
    );

    expect(result).toEqual({
      success: false,
      error: "This reset link is invalid or has expired.",
    });
  });

  it("hashes the new password, updates the user, and redirects on success", async () => {
    consumeVerificationTokenMock.mockResolvedValue({ success: true, email: "a@b.com" });
    bcryptMock.hash.mockResolvedValue("hashed-new");

    await expect(
      resetPassword(
        "raw-token",
        { success: false },
        formData({ password: "password1", confirmPassword: "password1" })
      )
    ).rejects.toThrow("REDIRECT:/reset-password?status=success");

    expect(bcryptMock.hash).toHaveBeenCalledWith("password1", 12);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { email: "a@b.com" },
      data: { password: "hashed-new" },
    });
  });
});
