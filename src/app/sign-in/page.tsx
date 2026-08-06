import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/components/auth/SignInForm";
import { signInWithCredentials, signInWithGithub, resendVerificationEmail } from "@/actions/auth";
import { auth } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const resolvedCallbackUrl = callbackUrl ?? "/dashboard";

  const session = await auth();
  if (session?.user) {
    redirect(`/dashboard?notice=already-signed-in`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm rounded-[15px]">
        <CardHeader>
          <CardTitle className="text-xl text-center">Sign in to DevStash</CardTitle>
          <CardDescription className="text-center">
            Store smarter. Build faster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm
            callbackUrl={resolvedCallbackUrl}
            signInAction={signInWithCredentials}
            githubAction={signInWithGithub.bind(null, resolvedCallbackUrl)}
            resendAction={resendVerificationEmail}
          />
        </CardContent>
      </Card>
    </div>
  );
}
