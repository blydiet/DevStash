import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";

const { resendMock, createVerificationTokenMock } = vi.hoisted(() => ({
  resendMock: { emails: { send: vi.fn() } },
  createVerificationTokenMock: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  resend: resendMock,
}));

vi.mock("@/lib/db/verification-tokens", () => ({
  createVerificationToken: createVerificationTokenMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  createVerificationTokenMock.mockResolvedValue("raw-token");
});

describe("sendVerificationEmail", () => {
  it("mints an email-verification token and sends a link containing it", async () => {
    resendMock.emails.send.mockResolvedValue({ error: null });

    await sendVerificationEmail("a@b.com", "http://localhost:3000");

    expect(createVerificationTokenMock).toHaveBeenCalledWith("email-verification", "a@b.com");
    const sendArgs = resendMock.emails.send.mock.calls[0][0];
    expect(sendArgs.to).toEqual(["a@b.com"]);
    expect(sendArgs.html).toContain("http://localhost:3000/verify-email?token=raw-token");
  });

  it("throws when Resend reports an error", async () => {
    resendMock.emails.send.mockResolvedValue({ error: { message: "Resend is down" } });

    await expect(sendVerificationEmail("a@b.com", "http://localhost:3000")).rejects.toThrow(
      "Resend is down"
    );
  });
});

describe("sendPasswordResetEmail", () => {
  it("mints a password-reset token and sends a link containing it", async () => {
    resendMock.emails.send.mockResolvedValue({ error: null });

    await sendPasswordResetEmail("a@b.com", "http://localhost:3000");

    expect(createVerificationTokenMock).toHaveBeenCalledWith("password-reset", "a@b.com");
    const sendArgs = resendMock.emails.send.mock.calls[0][0];
    expect(sendArgs.html).toContain("http://localhost:3000/reset-password?token=raw-token");
  });

  it("throws when Resend reports an error", async () => {
    resendMock.emails.send.mockResolvedValue({ error: { message: "Resend is down" } });

    await expect(sendPasswordResetEmail("a@b.com", "http://localhost:3000")).rejects.toThrow(
      "Resend is down"
    );
  });
});
