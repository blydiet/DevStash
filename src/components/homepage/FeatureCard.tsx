"use client";

import type { ReactNode } from "react";
import { useSpringInteraction } from "@/hooks/use-spring-interaction";
import { FEATURE_CARD_SPRING } from "@/lib/homepage/spring";

const SPAN_CLASSES = {
  default: "",
  wide: "sm:col-span-2",
  full: "sm:col-span-2 lg:col-span-3 lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-6",
} as const;

interface FeatureCardProps {
  /** A rendered icon element (e.g. `<Code />`), not a component reference —
   * component references aren't serializable across the server/client
   * boundary this card sits on. */
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
  span?: keyof typeof SPAN_CLASSES;
  children?: ReactNode;
}

export function FeatureCard({
  icon,
  title,
  description,
  color,
  span = "default",
  children,
}: FeatureCardProps) {
  const ref = useSpringInteraction<HTMLDivElement>(FEATURE_CARD_SPRING);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-[14px] border border-[var(--hp-border)] bg-[var(--hp-bg-card)] p-7 transition-colors duration-[250ms] hover:border-[var(--hp-border-strong)] hover:bg-[var(--hp-bg-card-hover)] ${SPAN_CLASSES[span]}`}
    >
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <div>
        <div
          className="mb-[18px] inline-flex size-10 items-center justify-center rounded-[8px]"
          style={{ backgroundColor: `${color}29`, color }}
        >
          {icon}
        </div>
        <h3 className="mb-2 text-[1.0625rem] font-semibold">{title}</h3>
        <p className="text-[0.9375rem] leading-[1.55] text-[var(--hp-text-secondary)]">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
