"use server";

import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validations/auth";
import type { ChangePasswordActionResult } from "@/types/auth";

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<ChangePasswordActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword,
    newPassword,
    confirmPassword,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

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
  const session = await auth();

  if (!session?.user?.id) {
    return;
  }

  await prisma.user.delete({ where: { id: session.user.id } });
  await signOut({ redirectTo: "/sign-in" });
}
