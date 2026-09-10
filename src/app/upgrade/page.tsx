import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { GlobalSearchContainer } from "@/components/dashboard/GlobalSearchContainer";
import { SidebarContainer } from "@/components/dashboard/SidebarContainer";
import { UpgradePricing } from "@/components/upgrade/UpgradePricing";
import { createCheckoutSession } from "@/actions/billing";
import { getBillingInfo } from "@/lib/db/subscription";
import { isKnownProFeature, PRO_FEATURE_UPGRADE_CONTEXT } from "@/lib/pricing-plans";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  // `feature` is untrusted query input. `isKnownProFeature` does a real
  // runtime membership check (not just a TS type predicate) against the
  // fixed PRO_FEATURE_UPGRADE_CONTEXT keys, and even then only the looked-up,
  // hardcoded copy is ever rendered — the raw query value itself never
  // reaches the page. A missing or unrecognized `feature` (no param, a
  // garbage value, a future feature not yet in the map) silently falls back
  // to `null` — the plain generic page, which is also what every
  // non-redirect visitor to /upgrade (header nav button, Settings' Billing
  // card) already sees.
  const { feature } = await searchParams;
  const featureContext = feature && isKnownProFeature(feature) ? PRO_FEATURE_UPGRADE_CONTEXT[feature] : null;

  let isPro = false;
  let hasError = false;

  try {
    const billing = await getBillingInfo();
    isPro = billing.isPro;
  } catch (err) {
    // Matches settings/page.tsx and BillingSettings.tsx's convention: covers
    // both "no session at all" (getCurrentUserId) and "session outlived its
    // User row" (AccountNotFoundError), which share this exact message by
    // design — see subscription.ts.
    if (err instanceof Error && err.message === "Not authenticated") {
      redirect("/sign-in?callbackUrl=/upgrade");
    }
    hasError = true;
  }

  // Nothing to upgrade to — send Pro users to where they'd manage their
  // existing subscription instead of showing them a pricing page.
  if (isPro) {
    redirect("/settings");
  }

  return (
    <DashboardShell
      sidebar={<SidebarContainer />}
      search={<GlobalSearchContainer />}
      upgradeButton={null}
      isPro={isPro}
    >
      {/* `my-auto` on the inner block, not `justify-center` on the outer
          flex column: `justify-content: center` (even the `safe` variant)
          has inconsistent cross-browser fallback behavior in flexbox when
          content overflows, and can clip the top of the content out of
          scroll range entirely. Auto margins center when there's room and
          degrade to 0 (plain top-aligned, fully scrollable) when the
          content is taller than the viewport — no ambiguity either way. */}
      <div className="flex min-h-full flex-col items-center">
        <div className="my-auto flex flex-col items-center gap-8 text-center">
          <div>
            {featureContext && (
              <p className="text-sm text-muted-foreground">{featureContext}</p>
            )}
            <h1 className="text-3xl font-bold">Upgrade to Pro</h1>
            <p className="text-muted-foreground">
              Unlimited items and collections, file uploads, and AI features.
            </p>
          </div>

          {hasError ? (
            <p className="text-sm text-destructive">Failed to load billing info. Please try again.</p>
          ) : (
            <UpgradePricing action={createCheckoutSession} />
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
