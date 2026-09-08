import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBillingInfo } from "@/lib/db/subscription";
import { createCheckoutSession, createBillingPortalSession } from "@/actions/billing";
import { ManageSubscriptionButton, UpgradeButtons } from "@/components/settings/BillingActions";

export async function BillingSettings() {
  let billing;
  try {
    billing = await getBillingInfo();
  } catch (err) {
    // Matches settings/page.tsx's convention for its own getProfileUser()
    // fetch: a session that outlived its User row (AccountNotFoundError,
    // thrown with this exact message by design — see subscription.ts) means
    // the visitor shouldn't be on this page at all, not just that this one
    // card failed to load.
    if (err instanceof Error && err.message === "Not authenticated") {
      redirect("/sign-in?callbackUrl=/settings");
    }
    return (
      <Card className="rounded-[10px] lg:w-[790px] md:w-[700px] w-[300px]">
        <CardHeader className="flex justify-center">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-4 text-muted-foreground" />
            Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load billing info. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[10px] lg:w-[790px] md:w-[700px] w-[300px]">
      <CardHeader className="flex justify-center">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" />
          Billing
          <Badge variant="outline" className="uppercase">
            {billing.isPro ? "Pro" : "Free"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {billing.isPro ? (
          <>
            <p className="text-sm text-muted-foreground">
              {billing.currentPeriodEnd
                ? `Renews ${billing.currentPeriodEnd.toLocaleDateString()}`
                : "You're on the Pro plan."}
            </p>
            <ManageSubscriptionButton action={createBillingPortalSession} />
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Upgrade for unlimited items and collections, file uploads, and AI features.
            </p>
            <UpgradeButtons action={createCheckoutSession} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
