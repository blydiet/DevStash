"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ChangePasswordActionResult } from "@/types/auth";

export function AccountActions({
  hasPassword,
  changePasswordAction,
  deleteAccountAction,
}: {
  hasPassword: boolean;
  changePasswordAction: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<ChangePasswordActionResult>;
  deleteAccountAction: () => Promise<void>;
}) {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    setIsSubmitting(true);
    try {
      const result = await changePasswordAction(currentPassword, newPassword, confirmPassword);
      if (!result.success) {
        setError(result.error ?? "Couldn't change your password. Try again.");
        return;
      }
      setChangePasswordOpen(false);
      toast.success("Password changed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="rounded-[10px] lg:w-[790px] md:w-[700px] w-[300px]">
      <CardHeader>
        <CardTitle>Account actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {hasPassword && (
          <p className="ml-[-150px]">
            Forgot password ?
          </p>
        )}
        <div className="flex justify-center gap-3">
          {hasPassword && (
            <Dialog
              open={changePasswordOpen}
              onOpenChange={(open) => {
                setChangePasswordOpen(open);
                setError(null);
              }}
            >
              <DialogTrigger render={<Button variant="outline" className="w-fit" />}>
                Change password
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change password</DialogTitle>
                  <DialogDescription>
                    Enter your current password and choose a new one.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="currentPassword">Current password</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="newPassword">New password</Label>
                    <Input id="newPassword" name="newPassword" type="password" required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : "Save password"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" className="w-fit" />}>
              Delete account
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes your account and all of your items, collections, and
                  tags. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <form action={deleteAccountAction}>
                  <AlertDialogAction type="submit" variant="destructive">
                    Delete account
                  </AlertDialogAction>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
