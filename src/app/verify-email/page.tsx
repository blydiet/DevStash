import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { consumeVerificationToken } from "@/lib/db/verification-tokens";
import { resendVerificationEmail } from "@/actions/auth";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const result = token
    ? await consumeVerificationToken(token)
    : ({ success: false, error: "invalid" } as const);

  if (result.success) {
    await prisma.user.update({
      where: { email: result.email },
      data: { emailVerified: new Date() },
    });
  }

  const title = result.success
    ? "Email verified"
    : result.error === "expired"
      ? "Verification link expired"
      : "Invalid verification link";

  const description = result.success
    ? "Your email is verified — you can now sign in."
    : result.error === "expired"
      ? "This link has expired. Request a new one below."
      : "This verification link is invalid or has already been used.";

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm rounded-[15px]">
        <CardHeader>
          <CardTitle className="text-xl text-center">{title}</CardTitle>
          <CardDescription className="text-center">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!result.success && result.error === "expired" && (
            <form
              action={async () => {
                "use server";
                await resendVerificationEmail(result.email);
              }}
            >
              <Button type="submit" variant="outline" className="w-full rounded-[10px]">
                Send a new verification email
              </Button>
            </form>
          )}
          <Link href="/sign-in">
            <Button className="w-full rounded-[10px]">Go to sign in</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
