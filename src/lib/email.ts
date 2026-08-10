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
