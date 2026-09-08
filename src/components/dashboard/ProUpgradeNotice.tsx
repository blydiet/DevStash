import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCheckoutSession } from "@/actions/billing";
import { UpgradeButtons } from "@/components/settings/BillingActions";

export function ProUpgradeNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="mx-auto w-full max-w-md rounded-[10px]">
      <CardHeader className="flex items-center justify-center text-center">
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">{description}</p>
        <UpgradeButtons action={createCheckoutSession} />
      </CardContent>
    </Card>
  );
}
