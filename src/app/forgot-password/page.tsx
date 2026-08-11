import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { requestPasswordReset } from "@/actions/auth";
import { auth } from "@/auth";

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user) {
    redirect(`/dashboard?notice=already-signed-in`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm rounded-[15px]">
        <CardHeader>
          <CardTitle className="text-xl text-center">Forgot your password?</CardTitle>
          <CardDescription className="text-center">
            Enter your email and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm requestAction={requestPasswordReset} />
        </CardContent>
      </Card>
    </div>
  );
}
