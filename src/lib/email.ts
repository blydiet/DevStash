import { resend } from "@/lib/resend";
import { createVerificationToken } from "@/lib/db/verification-tokens";

const FROM_EMAIL = "DevStash <onboarding@resend.dev>";

export async function sendVerificationEmail(email: string, baseUrl: string) {
  const token = await createVerificationToken("email-verification", email);
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: "Verify your DevStash email",
    html: `
      <p>Click the link below to verify your email and finish setting up your DevStash account:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours. If you didn't create a DevStash account, you can ignore this email.</p>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendPasswordResetEmail(email: string, baseUrl: string) {
  const token = await createVerificationToken("password-reset", email);
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: "Reset your DevStash password",
    html: `
      <p>Click the link below to choose a new password for your DevStash account:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 24 hours. If you didn't request a password reset, you can ignore this email.</p>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }
}
