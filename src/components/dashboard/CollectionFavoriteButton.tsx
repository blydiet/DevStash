"use client";

import { FavoriteToggleButton } from "@/components/dashboard/FavoriteToggleButton";
import { useToggleCollectionFavorite } from "@/hooks/use-toggle-collection-favorite";

interface CollectionFavoriteButtonProps {
  collectionId: string;
  isFavorite: boolean;
  className?: string;
}

export function CollectionFavoriteButton({
  collectionId,
  isFavorite,
  className,
}: CollectionFavoriteButtonProps) {
  const {
    isFavorite: currentIsFavorite,
    toggle,
    isTogglingFavorite,
  } = useToggleCollectionFavorite(collectionId, isFavorite);

  return (
    <FavoriteToggleButton
      isFavorite={currentIsFavorite}
      isPending={isTogglingFavorite}
      onToggle={toggle}
      className={className}
    />
  );
}
