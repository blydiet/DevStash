"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiError } from "@/lib/swr-fetcher";

export function useApiErrorToast() {
  const router = useRouter();

  return function handleApiError(err: unknown, fallbackMessage: string) {
    if (err instanceof ApiError && err.status === 401) {
      const signInUrl = new URL("/sign-in", window.location.origin);
      signInUrl.searchParams.set("callbackUrl", window.location.href);
      toast.error(err.message);
      router.push(`${signInUrl.pathname}${signInUrl.search}`);
      return;
    }
    toast.error(err instanceof Error ? err.message : fallbackMessage);
  };
}
