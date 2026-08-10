import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { peekVerificationToken } from "@/lib/db/verification-tokens";
import { resendVerificationEmail, confirmEmailVerification } from "@/actions/auth";

type View =
  | { state: "success" }
  | { state: "confirm"; token: string }
  | { state: "expired"; email: string }
  | { state: "invalid" };

async function resolveView(token: string | undefined, status: string | undefined): Promise<View> {
  if (status === "success") {
    return { state: "success" };
  }

  if (!token) {
    return { state: "invalid" };
  }

  const peek = await peekVerificationToken(token);

  if (peek.valid) {
    return { state: "confirm", token };
  }

  if (peek.reason === "expired") {
    return { state: "expired", email: peek.email };
  }

  return { state: "invalid" };
}

const TITLES: Record<View["state"], string> = {
  success: "Email verified",
  confirm: "Confirm your email",
  expired: "Verification link expired",
  invalid: "Invalid verification link",
};

const DESCRIPTIONS: Record<View["state"], string> = {
  success: "Your email is verified — you can now sign in.",
  confirm: "Click below to finish verifying your email address.",
  expired: "This link has expired. Request a new one below.",
  invalid: "This verification link is invalid or has already been used.",
};

export default async function VerifyEmailPage({
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
          {view.state === "confirm" && (
            <form action={confirmEmailVerification.bind(null, view.token)}>
              <Button type="submit" className="w-full rounded-[10px]">
                Verify email
              </Button>
            </form>
          )}
          {view.state === "expired" && (
            <form
              action={async () => {
                "use server";
                await resendVerificationEmail(view.email);
              }}
            >
              <Button type="submit" variant="outline" className="w-full rounded-[10px]">
                Send a new verification email
              </Button>
            </form>
          )}
          <Link href="/sign-in">
            <Button
              variant={view.state === "confirm" ? "outline" : "default"}
              className="w-full rounded-[10px]"
            >
              Go to sign in
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
