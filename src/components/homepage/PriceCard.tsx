"use client";

import { Check } from "lucide-react";
import { useSpringInteraction } from "@/hooks/use-spring-interaction";
import { PRICE_CARD_SPRING } from "@/lib/homepage/spring";
import { HomeButton } from "@/components/homepage/HomeButton";

interface PriceCardProps {
  name: string;
  price: string;
  period?: string;
  note: string;
  features: string[];
  highlight?: boolean;
  ctaLabel: string;
  ctaHref: string;
}

export function PriceCard({
  name,
  price,
  period,
  note,
  features,
  highlight = false,
  ctaLabel,
  ctaHref,
}: PriceCardProps) {
  const ref = useSpringInteraction<HTMLDivElement>(PRICE_CARD_SPRING);

  return (
    <div
      ref={ref}
      className={`relative rounded-[14px] border p-8 ${
        highlight
          ? "border-[var(--hp-accent)] bg-gradient-to-b from-[color-mix(in_srgb,var(--hp-accent)_8%,var(--hp-bg-card))] to-[var(--hp-bg-card)] shadow-[0_24px_60px_rgba(59,130,246,0.18)]"
          : "border-[var(--hp-border)] bg-[var(--hp-bg-card)]"
      }`}
    >
      {highlight && (
        <span className="font-mono-hp absolute -top-[13px] left-8 rounded-full bg-[var(--hp-accent-solid)] px-3 py-[5px] text-[0.6875rem] tracking-[0.06em] text-white uppercase">
          Most popular
        </span>
      )}
      <h3 className="mb-4 text-[1.0625rem] font-semibold text-[var(--hp-text-secondary)]">{name}</h3>
      <p className="mb-1 flex items-baseline gap-1">
        <span className="text-[2.75rem] leading-none font-bold tracking-tight">{price}</span>
        {period && <span className="text-[0.9375rem] text-[var(--hp-text-tertiary)]">{period}</span>}
      </p>
      <p className="mb-6 text-sm text-[var(--hp-text-tertiary)]">{note}</p>
      <ul className="mb-7 flex flex-col gap-3">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-2.5 text-[0.9375rem] text-[var(--hp-text-secondary)]"
          >
            <Check
              className="size-4 shrink-0"
              style={{ color: highlight ? "var(--hp-accent)" : "var(--hp-text-tertiary)" }}
            />
            {feature}
          </li>
        ))}
      </ul>
      <HomeButton href={ctaHref} variant={highlight ? "primary" : "secondary"} className="w-full">
        {ctaLabel}
      </HomeButton>
    </div>
  );
}
