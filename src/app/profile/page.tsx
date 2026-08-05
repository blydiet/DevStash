import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SidebarContainer } from "@/components/dashboard/SidebarContainer";

export default function ProfilePage() {
  return (
    <DashboardShell sidebar={<SidebarContainer />}>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Profile settings coming soon.</p>
      </div>
    </DashboardShell>
  );
}
