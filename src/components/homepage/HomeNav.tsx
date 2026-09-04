"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { HomeButton } from "@/components/homepage/HomeButton";

export function HomeNav() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const nav = navRef.current;
    if (!sentinel || !nav || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        nav.classList.toggle("hp-nav--scrolled", !entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Deliberately unpositioned — a plain normal-flow element at the
          very top of the document, so it scrolls away naturally as soon
          as the page scrolls. `position: fixed` would pin it to the
          viewport and it would never leave the intersection (the nav's
          "scrolled" background would never activate); `position:
          absolute` would depend on whichever ancestor ends up as its
          nearest positioned one, which isn't guaranteed to sit at the
          true top of the page. */}
      <div ref={sentinelRef} className="h-px w-px" aria-hidden="true" />
      <header
        ref={navRef}
        className="hp-nav fixed inset-x-0 top-0 z-50 flex h-[68px] items-center border-b border-transparent bg-transparent transition-colors duration-300"
      >
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-6 px-6">
          <Link href="/" className="inline-flex shrink-0 items-center gap-2 text-[1.0625rem] font-semibold">
            <Package className="size-5 text-[var(--hp-accent)]" aria-hidden="true" />
            DevStash
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-7 text-[0.9375rem] text-[var(--hp-text-secondary)] md:flex"
          >
            <a href="#features" className="transition-colors hover:text-[var(--hp-text-primary)]">
              Features
            </a>
            <a href="#pricing" className="transition-colors hover:text-[var(--hp-text-primary)]">
              Pricing
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <HomeButton href="/sign-in" variant="ghost" className="hidden md:inline-flex">
              Sign in
            </HomeButton>
            <HomeButton
              href="/register"
              variant="primary"
              size="sm"
              className="md:px-[22px] md:py-[11px] md:text-[0.9375rem]"
            >
              Get started
            </HomeButton>
          </div>
        </div>
      </header>
    </>
  );
}
