"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut, EmailNotVerifiedError, RateLimitedError } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import { consumeVerificationToken } from "@/lib/db/verification-tokens";
import { isEmailVerificationEnabled } from "@/lib/feature-flags";
import { checkRateLimit, getClientIp, rateLimitMessage } from "@/lib/rate-limit";
import { credentialsSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth";
import type { SignInActionResult, ResetPasswordActionResult } from "@/types/auth";

async function getBaseUrl() {
  const requestHeaders = await headers();
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${requestHeaders.get("host")}`;
}

export async function signInWithCredentials(
  _prevState: SignInActionResult,
  formData: FormData
): Promise<SignInActionResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: (formData.get("callbackUrl") as string) || "/dashboard",
    });
  } catch (error) {
    if (error instanceof RateLimitedError) {
      return { success: false, error: rateLimitMessage(error.reset) };
    }
    if (error instanceof EmailNotVerifiedError) {
      return {
        success: false,
        error: "Please verify your email before signing in.",
        unverified: true,
        email: parsed.data.email,
      };
    }
    if (error instanceof AuthError) {
      return { success: false, error: "Invalid email or password" };
    }
    throw error;
  }

  return { success: true };
}

export async function signInWithGithub(callbackUrl: string) {
  await signIn("github", { redirectTo: callbackUrl || "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/sign-in" });
}

export async function resendVerificationEmail(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!isEmailVerificationEnabled()) {
    return { success: true };
  }

  const ip = await getClientIp();
  const { success: withinLimit, reset } = await checkRateLimit(
    "resend-verification",
    `${ip}:${email}`
  );

  if (!withinLimit) {
    return { success: false, error: rateLimitMessage(reset) };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Don't reveal whether the account exists or is GitHub-only.
  if (!user?.password || user.emailVerified) {
    return { success: true };
  }

  try {
    await sendVerificationEmail(email, await getBaseUrl());
  } catch (err) {
    console.error("Failed to resend verification email:", err);
    return { success: false, error: "Couldn't send the email. Try again in a moment." };
  }

  return { success: true };
}

export async function confirmEmailVerification(rawToken: string) {
  const result = await consumeVerificationToken("email-verification", rawToken);

  if (result.success) {
    await prisma.user.update({
      where: { email: result.email },
      data: { emailVerified: new Date() },
    });
    redirect("/verify-email?status=success");
  }

  redirect("/verify-email?status=invalid");
}

export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = forgotPasswordSchema.safeParse({ email });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const ip = await getClientIp();
  const { success: withinLimit, reset } = await checkRateLimit("forgot-password", ip);

  if (!withinLimit) {
    return { success: false, error: rateLimitMessage(reset) };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Don't reveal whether the account exists or is GitHub-only.
  if (!user?.password) {
    return { success: true };
  }

  try {
    await sendPasswordResetEmail(parsed.data.email, await getBaseUrl());
  } catch (err) {
    console.error("Failed to send password reset email:", err);
    return { success: false, error: "Couldn't send the email. Try again in a moment." };
  }

  return { success: true };
}

export async function resetPassword(
  rawToken: string,
  _prevState: ResetPasswordActionResult,
  formData: FormData
): Promise<ResetPasswordActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const ip = await getClientIp();
  const { success: withinLimit, reset } = await checkRateLimit("reset-password", ip);

  if (!withinLimit) {
    return { success: false, error: rateLimitMessage(reset) };
  }

  const result = await consumeVerificationToken("password-reset", rawToken);

  if (!result.success) {
    return { success: false, error: "This reset link is invalid or has expired." };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { email: result.email },
    data: { password: hashedPassword },
  });

  redirect("/reset-password?status=success");
}
