"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitHubIcon } from "@/components/shared/GitHubIcon";
import type { SignInActionResult } from "@/types/auth";

const initialState: SignInActionResult = { success: false };

function ResendVerificationButton({
  email,
  resendAction,
}: {
  email: string;
  resendAction: (email: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [isSending, setIsSending] = useState(false);

  async function handleResend() {
    setIsSending(true);
    try {
      const result = await resendAction(email);
      if (result.success) {
        toast.success("Verification email sent — check your inbox.");
      } else {
        toast.error(result.error ?? "Couldn't send the email. Try again in a moment.");
      }
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="link"
      className="h-auto self-start p-0 text-sm"
      onClick={handleResend}
      disabled={isSending}
    >
      {isSending ? "Sending..." : "Resend verification email"}
    </Button>
  );
}

export function SignInForm({
  callbackUrl,
  signInAction,
  githubAction,
  resendAction,
}: {
  callbackUrl: string;
  signInAction: (
    state: SignInActionResult,
    formData: FormData
  ) => Promise<SignInActionResult>;
  githubAction: () => Promise<void>;
  resendAction: (email: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <div className="flex flex-col gap-6">
      <form action={githubAction}>
        <Button type="submit" variant="outline" className="w-full rounded-[10px]">
          <GitHubIcon />
          Sign in with GitHub
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            className="rounded-[10px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            required
            className="rounded-[10px]"
          />
        </div>

        {state.error && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-destructive">{state.error}</p>
            {state.unverified && state.email && (
              <ResendVerificationButton email={state.email} resendAction={resendAction} />
            )}
          </div>
        )}

        <Button type="submit" className="w-full rounded-[10px]" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
