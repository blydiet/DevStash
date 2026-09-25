"use server";

import { cookies } from "next/headers";
import { THEME_COOKIE_NAME, THEME_COOKIE_MAX_AGE, parseTheme, type Theme } from "@/lib/theme-cookie";

export async function setTheme(theme: Theme) {
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE_NAME, parseTheme(theme), {
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}
