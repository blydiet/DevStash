"use client";

import { useState } from "react";
import { PriceCard } from "@/components/homepage/PriceCard";
import { Switch } from "@/components/ui/switch";
import {
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_MONTHLY_EQUIVALENT,
  PRO_YEARLY_SAVINGS_PERCENT,
  PRO_YEARLY_TOTAL,
} from "@/lib/pricing-plans";

export function BillingToggle() {
  const [isYearly, setIsYearly] = useState(false);

  const proPrice = isYearly ? PRO_YEARLY_MONTHLY_EQUIVALENT : PRO_MONTHLY_PRICE;
  const proNote = isYearly ? `billed annually at ${PRO_YEARLY_TOTAL}/yr` : "billed monthly";

  return (
    <div>
      <div className="mb-12 flex items-center justify-center gap-3.5 text-[0.9375rem]">
        <span
          className={isYearly ? "text-[var(--hp-text-tertiary)]" : "text-[var(--hp-text-primary)]"}
        >
          Monthly
        </span>
        <Switch
          size="lg"
          aria-label="Toggle yearly billing"
          checked={isYearly}
          onCheckedChange={setIsYearly}
          className="hp-switch transition-colors duration-200"
        />
        <span
          className="flex items-center gap-2"
          style={{ color: isYearly ? "var(--hp-text-primary)" : "var(--hp-text-tertiary)" }}
        >
          Yearly
          <span className="font-mono-hp rounded-full bg-[rgba(34,197,94,0.12)] px-2 py-0.5 text-[0.6875rem] text-[#22c55e]">
            save {PRO_YEARLY_SAVINGS_PERCENT}%
          </span>
        </span>
      </div>

      <div className="mx-auto grid max-w-[380px] grid-cols-1 gap-5 sm:max-w-none sm:grid-cols-[repeat(2,minmax(0,380px))] sm:justify-center">
        <PriceCard
          name="Free"
          price="$0"
          note="forever"
          features={FREE_PLAN_FEATURES}
          ctaLabel="Get started"
          ctaHref="/register"
        />
        <PriceCard
          name="Pro"
          price={proPrice}
          period="/mo"
          note={proNote}
          features={PRO_PLAN_FEATURES}
          highlight
          ctaLabel="Get started"
          ctaHref="/register"
        />
      </div>
    </div>
  );
}
