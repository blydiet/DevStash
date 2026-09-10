import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { GlobalSearchContainer } from "@/components/dashboard/GlobalSearchContainer";
import { PinnedItems } from "@/components/dashboard/PinnedItems";
import { RecentCollections } from "@/components/dashboard/RecentCollections";
import { RecentItems } from "@/components/dashboard/RecentItems";
import { SidebarContainer } from "@/components/dashboard/SidebarContainer";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { UpgradeNavButton } from "@/components/dashboard/UpgradeNavButton";
import { getDashboardIsPro } from "@/lib/db/user";

export default async function DashboardPage() {
  const isPro = await getDashboardIsPro("/dashboard");

  return (
    <DashboardShell
      sidebar={<SidebarContainer />}
      search={<GlobalSearchContainer />}
      upgradeButton={<UpgradeNavButton isPro={isPro} />}
      isPro={isPro}
    >
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your developer knowledge hub</p>
        </div>
        <StatsCards />
        <RecentCollections />
        <PinnedItems />
        <RecentItems />
      </div>
    </DashboardShell>
  );
}
