"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { credentialsSchema } from "@/lib/validations/auth";
import type { SignInActionResult } from "@/types/auth";

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
