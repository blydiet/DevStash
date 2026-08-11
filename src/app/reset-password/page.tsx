import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { peekVerificationToken } from "@/lib/db/verification-tokens";
import { requestPasswordReset, resetPassword } from "@/actions/auth";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

type View =
  | { state: "success" }
  | { state: "form"; token: string }
  | { state: "expired"; email: string }
  | { state: "invalid" };

async function resolveView(token: string | undefined, status: string | undefined): Promise<View> {
  if (status === "success") {
    return { state: "success" };
  }

  if (!token) {
    return { state: "invalid" };
  }

  const peek = await peekVerificationToken("password-reset", token);

  if (peek.valid) {
    return { state: "form", token };
  }

  if (peek.reason === "expired") {
    return { state: "expired", email: peek.email };
  }

  return { state: "invalid" };
}

const TITLES: Record<View["state"], string> = {
  success: "Password reset",
  form: "Choose a new password",
  expired: "Reset link expired",
  invalid: "Invalid reset link",
};

const DESCRIPTIONS: Record<View["state"], string> = {
  success: "Your password has been reset — you can now sign in.",
  form: "Enter a new password for your account.",
  expired: "This link has expired. Request a new one below.",
  invalid: "This reset link is invalid or has already been used.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string }>;
}) {
  const { token, status } = await searchParams;
  const view = await resolveView(token, status);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm rounded-[15px]">
        <CardHeader>
          <CardTitle className="text-xl text-center">{TITLES[view.state]}</CardTitle>
          <CardDescription className="text-center">{DESCRIPTIONS[view.state]}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {view.state === "form" && (
            <ResetPasswordForm resetAction={resetPassword.bind(null, view.token)} />
          )}
          {view.state === "expired" && (
            <form
              action={async () => {
                "use server";
                await requestPasswordReset(view.email);
              }}
            >
              <Button type="submit" variant="outline" className="w-full rounded-[10px]">
                Send a new reset link
              </Button>
            </form>
          )}
          {view.state !== "form" && (
            <Link href="/sign-in">
              <Button variant="default" className="w-full rounded-[10px]">
                Go to sign in
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
