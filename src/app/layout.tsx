import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProStatusSync } from "@/components/shared/ProStatusSync";
import { ThemeProvider } from "@/components/theme/ThemeContext";
import { AppToaster } from "@/components/theme/AppToaster";
import { THEME_COOKIE_NAME, parseTheme } from "@/lib/theme-cookie";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevStash",
  description: "Store Smarter. Build Faster.",
};

// Awaiting cookies() here opts every route into dynamic rendering, which is a
// deliberate trade, not an oversight. The theme class has to land on <html>,
// and <html> is rendered by this layout itself — so the usual escape hatch for
// this (don't await at the top; pass the promise into a child inside
// <Suspense> so the shell still prerenders) doesn't apply: you can't stream an
// attribute onto a tag that has already been flushed. The only other way to
// keep this static is a pre-paint inline script reading document.cookie, which
// trades correct SSR for a flash-of-wrong-theme risk and would make the
// suppressHydrationWarning below genuinely load-bearing.
//
// The actual cost here is one route: every other route already reads the
// session via auth(), so they were dynamic before this. Only /_not-found went
// ○ (static) → ƒ (dynamic). Verified by diffing the full next build route table 
// with and without this change: 26 ƒ + 1 ○ → 27 ƒ.
// Revisit if this app ever adopts Cache Components
// / PPR, where the shell could prerender around a streamed dynamic hole.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = parseTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider initialTheme={theme}>
          <SessionProvider refetchInterval={5 * 60}>
            <TooltipProvider>{children}</TooltipProvider>
            <ProStatusSync />
          </SessionProvider>
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
