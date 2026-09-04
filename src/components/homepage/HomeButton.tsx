"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useSpringInteraction } from "@/hooks/use-spring-interaction";
import { BUTTON_SPRING } from "@/lib/homepage/spring";
import { cn } from "@/lib/utils";

const VARIANT_CLASSES = {
  primary:
    "bg-[var(--hp-accent-solid)] text-white hover:bg-[var(--hp-accent-solid-hover)] hover:shadow-[0_8px_24px_rgba(37,99,235,0.4)]",
  secondary:
    "border border-[var(--hp-border-strong)] text-[var(--hp-text-primary)] hover:border-[var(--hp-accent)] hover:bg-[var(--hp-accent-soft)]",
  ghost: "text-[var(--hp-text-secondary)] px-4 hover:text-[var(--hp-text-primary)]",
} as const;

const SIZE_CLASSES = {
  sm: "px-4 py-2 text-sm",
  default: "px-[22px] py-[11px] text-[0.9375rem]",
  lg: "px-7 py-3.5 text-base",
} as const;

interface HomeButtonProps extends Pick<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> {
  href: string;
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
  children: ReactNode;
}

/** Pill-shaped marketing CTA, spring-driven on hover/press (falls back to a plain CSS `:active` scale under `prefers-reduced-motion`). */
export function HomeButton({ href, variant = "primary", size = "default", className, children }: HomeButtonProps) {
  const ref = useSpringInteraction<HTMLAnchorElement>(BUTTON_SPRING);

  return (
    <Link
      ref={ref}
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 active:scale-97",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}
