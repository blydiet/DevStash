import { CalendarDays, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type { ProfileUser } from "@/lib/db/user";

function formatJoinDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function ProfileInfo({ user }: { user: ProfileUser }) {
  return (
    <Card className="flex rounded-[10px] lg:w-[790px]  md:w-[700px] w-[300px]">
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar name={user.name} image={user.image} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-lg font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">
              Signed in with {user.authProvider === "github" ? "GitHub" : "Email"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Email:</span>
            <span>{user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Member since:</span>
            <span>{formatJoinDate(user.createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
