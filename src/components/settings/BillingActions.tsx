"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { PRO_MONTHLY_PRICE, PRO_YEARLY_TOTAL } from "@/lib/pricing-plans";
import type { CreateCheckoutSessionResult, CreatePortalSessionResult } from "@/types/billing";

const idleCheckoutState: CreateCheckoutSessionResult = { success: true };
const idlePortalState: CreatePortalSessionResult = { success: true };

export function ManageSubscriptionButton({
  action,
}: {
  action: () => Promise<CreatePortalSessionResult>;
}) {
  const [state, formAction, isPending] = useActionState(async () => action(), idlePortalState);

  return (
    <div className="flex flex-col items-center gap-2">
      <form action={formAction}>
        <Button type="submit" variant="outline" className="rounded-[5px]" disabled={isPending}>
          {isPending ? "Opening..." : "Manage subscription"}
        </Button>
      </form>
      {!state.success && state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}

function UpgradeButton({
  action,
  period,
  label,
  variant,
}: {
  action: (period: "monthly" | "yearly") => Promise<CreateCheckoutSessionResult>;
  period: "monthly" | "yearly";
  label: string;
  variant?: "outline";
}) {
  const [state, formAction, isPending] = useActionState(async () => action(period), idleCheckoutState);

  return (
    <div className="flex flex-col items-center gap-2">
      <form action={formAction}>
        <Button type="submit" variant={variant} className="rounded-[5px]" disabled={isPending}>
          {isPending ? "Redirecting..." : label}
        </Button>
      </form>
      {!state.success && state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}

export function UpgradeButtons({
  action,
}: {
  action: (period: "monthly" | "yearly") => Promise<CreateCheckoutSessionResult>;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <UpgradeButton action={action} period="monthly" label={`Upgrade - ${PRO_MONTHLY_PRICE}/mo`} />
      <UpgradeButton
        action={action}
        period="yearly"
        label={`Upgrade - ${PRO_YEARLY_TOTAL}/yr`}
        variant="outline"
      />
    </div>
  );
}
