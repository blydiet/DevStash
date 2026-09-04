"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { springReveal } from "@/lib/homepage/spring";

/**
 * Fades/rises a section into view the first time it scrolls into the
 * viewport, with a spring overshoot instead of a linear ease.
 *
 * Renders fully visible by default (matching SSR output, so there's no
 * hydration mismatch and nothing ever depends on JS to become visible).
 * Only once mounted — and only when JS actually runs, IntersectionObserver
 * exists, and the visitor hasn't asked for reduced motion — does a
 * layout effect synchronously hide it just before paint and start
 * watching for it to scroll into view.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(28px)";

    let cancelSpring: (() => void) | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          cancelSpring = springReveal(el);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelSpring?.();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
