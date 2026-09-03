"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWRMutation from "swr/mutation";
import { toggleCollectionFavoriteMutation } from "@/lib/swr-fetcher";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";

export function useToggleCollectionFavorite(collectionId: string, isFavoriteProp: boolean) {
  const router = useRouter();
  const handleApiError = useApiErrorToast();
  const [isFavorite, setIsFavorite] = useState(isFavoriteProp);
  const { trigger, isMutating } = useSWRMutation(
    `/api/collections/${collectionId}/favorite`,
    toggleCollectionFavoriteMutation,
  );

  const [lastProp, setLastProp] = useState(isFavoriteProp);
  if (isFavoriteProp !== lastProp) {
    setLastProp(isFavoriteProp);
    setIsFavorite(isFavoriteProp);
  }

  async function toggle() {
    if (isMutating) return;

    const next = !isFavorite;
    setIsFavorite(next);
    try {
      await trigger({ isFavorite: next });
    } catch (err) {
      setIsFavorite(!next);
      handleApiError(err, "Failed to update favorite");
      return;
    }

    router.refresh();
  }

  return { isFavorite, toggle, isTogglingFavorite: isMutating };
}
