import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PinnedItems } from "@/components/dashboard/PinnedItems";
import { RecentCollections } from "@/components/dashboard/RecentCollections";
import { RecentItems } from "@/components/dashboard/RecentItems";
import { SidebarContainer } from "@/components/dashboard/SidebarContainer";
import { StatsCards } from "@/components/dashboard/StatsCards";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;

  return (
    <DashboardShell sidebar={<SidebarContainer />}>
      <div className="flex flex-col gap-8">
        {notice === "already-signed-in" && (
          <div className="rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-muted-foreground">
            You&apos;re already signed in.
          </div>
        )}
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
