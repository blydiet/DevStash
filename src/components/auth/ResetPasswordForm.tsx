"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ResetPasswordActionResult } from "@/types/auth";

const initialState: ResetPasswordActionResult = { success: false };

export function ResetPasswordForm({
  resetAction,
}: {
  resetAction: (
    state: ResetPasswordActionResult,
    formData: FormData
  ) => Promise<ResetPasswordActionResult>;
}) {
  const [state, formAction, isPending] = useActionState(resetAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          className="rounded-[10px]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm new password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          className="rounded-[10px]"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" className="w-full rounded-[10px]" disabled={isPending}>
        {isPending ? "Resetting..." : "Reset password"}
      </Button>
    </form>
  );
}
