"use server";

import bcrypt from "bcryptjs";
import { signOut } from "@/auth";
import { requireSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validations/auth";
import type { ChangePasswordActionResult } from "@/types/auth";

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<ChangePasswordActionResult> {
  const authed = await requireSession();
  if (!authed.ok) return authed.result;

  const parsed = changePasswordSchema.safeParse({
    currentPassword,
    newPassword,
    confirmPassword,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: authed.user.userId } });

  if (!user.password) {
    return { success: false, error: "This account doesn't use a password" };
  }

  const isValidPassword = await bcrypt.compare(parsed.data.currentPassword, user.password);

  if (!isValidPassword) {
    return { success: false, error: "Current password is incorrect" };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  return { success: true };
}

export async function deleteAccount() {
  const authed = await requireSession();
  if (!authed.ok) return;

  await prisma.user.delete({ where: { id: authed.user.userId } });
  await signOut({ redirectTo: "/sign-in" });
}
