"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FavoriteToggleButtonProps {
  isFavorite: boolean;
  isPending: boolean;
  onToggle: () => void;
  className?: string;
}

export function FavoriteToggleButton({
  isFavorite,
  isPending,
  onToggle,
  className,
}: FavoriteToggleButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-7 text-muted-foreground", className, isFavorite && "text-yellow-500")}
      disabled={isPending}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Star className={cn("size-3.5", isFavorite && "fill-yellow-500")} />
    </Button>
  );
}
