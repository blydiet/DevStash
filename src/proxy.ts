import { NextResponse } from "next/server";
import { auth } from "@/auth";


export const proxy = auth((req) => {
  const isProtected =
    req.nextUrl.pathname.startsWith("/dashboard") || req.nextUrl.pathname.startsWith("/profile");

  if (isProtected && !req.auth) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
