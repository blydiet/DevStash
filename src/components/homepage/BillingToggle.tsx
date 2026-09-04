"use client";

import { useState } from "react";
import { PriceCard } from "@/components/homepage/PriceCard";

const FREE_FEATURES = ["50 items", "3 collections", "Basic search", "Image uploads"];
const PRO_FEATURES = [
  "Unlimited items",
  "Unlimited collections",
  "File uploads",
  "Custom item types",
  "AI features",
  "Export",
];

export function BillingToggle() {
  const [isYearly, setIsYearly] = useState(false);

  const proPrice = isYearly ? "$6" : "$8";
  const proNote = isYearly ? "billed annually at $72/yr" : "billed monthly";

  return (
    <div>
      <div className="mb-12 flex items-center justify-center gap-3.5 text-[0.9375rem]">
        <span
          className={isYearly ? "text-[var(--hp-text-tertiary)]" : "text-[var(--hp-text-primary)]"}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isYearly}
          aria-label="Toggle yearly billing"
          onClick={() => setIsYearly((v) => !v)}
          className={`relative h-6 w-11 rounded-full border transition-colors duration-200 ${
            isYearly
              ? "border-[var(--hp-accent)] bg-[var(--hp-accent)]"
              : "border-[var(--hp-border-strong)] bg-[var(--hp-bg-card)]"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-[18px] rounded-full bg-white transition-transform duration-[350ms] ease-[var(--hp-ease-spring)] ${
              isYearly ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span
          className="flex items-center gap-2"
          style={{ color: isYearly ? "var(--hp-text-primary)" : "var(--hp-text-tertiary)" }}
        >
          Yearly
          <span className="font-mono-hp rounded-full bg-[rgba(34,197,94,0.12)] px-2 py-0.5 text-[0.6875rem] text-[#22c55e]">
            save 25%
          </span>
        </span>
      </div>

      <div className="mx-auto grid max-w-[380px] grid-cols-1 gap-5 sm:max-w-none sm:grid-cols-[repeat(2,minmax(0,380px))] sm:justify-center">
        <PriceCard
          name="Free"
          price="$0"
          note="forever"
          features={FREE_FEATURES}
          ctaLabel="Get started"
          ctaHref="/register"
        />
        <PriceCard
          name="Pro"
          price={proPrice}
          period="/mo"
          note={proNote}
          features={PRO_FEATURES}
          highlight
          ctaLabel="Get started"
          ctaHref="/register"
        />
      </div>
    </div>
  );
}
