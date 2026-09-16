"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_MONTHLY_EQUIVALENT,
  PRO_YEARLY_SAVINGS_PERCENT,
  PRO_YEARLY_TOTAL,
} from "@/lib/pricing-plans";
import type { CreateCheckoutSessionResult } from "@/types/billing";

type BillingPeriod = "monthly" | "yearly";

const idleState: CreateCheckoutSessionResult = { success: true };

export function UpgradePricing({
  action,
}: {
  action: (period: BillingPeriod) => Promise<CreateCheckoutSessionResult>;
}) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  // `action` reads the current `period` via closure, not a fixed argument
  // captured at mount, so toggling billing before submitting always checks
  // out at the selected period.
  const [state, formAction, isPending] = useActionState(async () => action(period), idleState);

  const isYearly = period === "yearly";
  const proPrice = isYearly ? PRO_YEARLY_MONTHLY_EQUIVALENT : PRO_MONTHLY_PRICE;
  const proNote = isYearly ? `billed annually at ${PRO_YEARLY_TOTAL}/yr` : "billed monthly";

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex items-center gap-3 text-sm">
        <span className={isYearly ? "text-muted-foreground" : "text-foreground"}>Monthly</span>
        <Switch
          aria-label="Toggle yearly billing"
          checked={isYearly}
          onCheckedChange={(checked) => setPeriod(checked ? "yearly" : "monthly")}
          disabled={isPending}
        />
        <span className={isYearly ? "text-foreground" : "text-muted-foreground"}>Yearly</span>
        <Badge variant="secondary">Save {PRO_YEARLY_SAVINGS_PERCENT}%</Badge>
      </div>

      {/* Card widths/padding/type sizes matched to the homepage's PriceCard
          (BillingToggle.tsx) so the same Free/Pro boxes don't look smaller or
          differently proportioned here than on the marketing page. */}
      <div className="mx-auto grid w-full max-w-[380px] grid-cols-1 gap-5 sm:max-w-none sm:grid-cols-[repeat(2,minmax(0,380px))] sm:justify-center">
        <Card className="rounded-[10px] [--card-spacing:2rem]">
          <CardHeader>
            <CardTitle className="text-[1.0625rem]">Free</CardTitle>
            <p className="mt-2 text-[2.75rem] leading-none font-bold">$0</p>
            <p className="text-sm text-muted-foreground">forever</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-5">
            <ul className="flex flex-col gap-3 text-sm">
              {FREE_PLAN_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5">
                  <Check className="size-4 shrink-0 text-muted-foreground" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="rounded-[5px]" disabled>
              Current plan
            </Button>
          </CardContent>
        </Card>

        <Card className="relative rounded-[10px] ring-2 ring-primary [--card-spacing:2rem]">
          <CardHeader>
            <CardTitle className="text-[1.0625rem]">Pro</CardTitle>
            <p className="mt-2 flex items-baseline justify-center gap-1">
              <span className="text-[2.75rem] leading-none font-bold">{proPrice}</span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </p>
            <p className="text-sm text-muted-foreground">{proNote}</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-5">
            <ul className="flex flex-col gap-3 text-sm">
              {PRO_PLAN_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5">
                  <Check className="size-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <form action={formAction}>
                <Button type="submit" className="w-full rounded-[5px]" disabled={isPending}>
                  {isPending ? "Redirecting..." : "Upgrade to Pro"}
                </Button>
              </form>
              {!state.success && state.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
