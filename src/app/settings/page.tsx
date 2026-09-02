import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { GlobalSearchContainer } from "@/components/dashboard/GlobalSearchContainer";
import { SidebarContainer } from "@/components/dashboard/SidebarContainer";
import { AccountActions } from "@/components/profile/AccountActions";
import { getProfileUser } from "@/lib/db/user";
import { changePassword, deleteAccount } from "@/actions/profile";

export default async function SettingsPage() {
  let hasError = false;
  let hasPassword: boolean | null = null;

  try {
    const profileUser = await getProfileUser();
    hasPassword = profileUser.hasPassword;
  } catch (err) {
    if (err instanceof Error && err.message === "Not authenticated") {
      redirect("/sign-in?callbackUrl=/settings");
    }
    hasError = true;
  }

  return (
    <DashboardShell sidebar={<SidebarContainer />} search={<GlobalSearchContainer />}>
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex w-[300px] flex-col items-start gap-1 text-left md:w-[700px] lg:w-[790px]">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        {hasError && (
          <p className="text-sm text-destructive">Failed to load settings. Please try again.</p>
        )}

        {hasPassword !== null && (
          <AccountActions
            hasPassword={hasPassword}
            changePasswordAction={changePassword}
            deleteAccountAction={deleteAccount}
          />
        )}
      </div>
    </DashboardShell>
  );
}
