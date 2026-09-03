"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleItemFavorite } from "@/actions/items";

export function useToggleItemFavorite(itemId: string, isFavoriteProp: boolean) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(isFavoriteProp);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const [lastProp, setLastProp] = useState(isFavoriteProp);
  if (isFavoriteProp !== lastProp) {
    setLastProp(isFavoriteProp);
    setIsFavorite(isFavoriteProp);
  }

  async function toggle() {
    if (isTogglingFavorite) return;

    const next = !isFavorite;
    setIsFavorite(next);
    setIsTogglingFavorite(true);
    try {
      const result = await toggleItemFavorite(itemId, next);

      if (!result.success) {
        setIsFavorite(!next);
        toast.error(result.error ?? "Failed to update favorite");
        return;
      }

      router.refresh();
    } catch {
      setIsFavorite(!next);
      toast.error("Failed to update favorite");
    } finally {
      setIsTogglingFavorite(false);
    }
  }

  return { isFavorite, toggle, isTogglingFavorite };
}
