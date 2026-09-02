import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { GlobalSearchContainer } from "@/components/dashboard/GlobalSearchContainer";
import { SidebarContainer } from "@/components/dashboard/SidebarContainer";
import { ProfileInfo } from "@/components/profile/ProfileInfo";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { getProfileUser } from "@/lib/db/user";

export default async function ProfilePage() {
  let profileError: string | null = null;
  let profileUser: Awaited<ReturnType<typeof getProfileUser>> | null = null;

  try {
    profileUser = await getProfileUser();
  } catch (err) {
    profileError = err instanceof Error ? err.message : "Failed to load profile";
  }

  return (
    <DashboardShell sidebar={<SidebarContainer />} search={<GlobalSearchContainer />}>
      <div className="flex flex-col gap-6 md: items-center  ">
        <div className="flex flex-col gap-1  md:items-start lg:mr-[490px] md:mr-[400px]">
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">View your account information and usage</p>
        </div>

        {profileError && (
          <p className="text-sm text-destructive">Failed to load profile: {profileError}</p>
        )}

        {profileUser && (
          <>
            <ProfileInfo user={profileUser} />
            <ProfileStats />
          </>
        )}
      </div>
    </DashboardShell>
  );
}
