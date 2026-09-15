import type { LucideIcon } from "lucide-react";

interface IconBadgeProps {
  icon: LucideIcon;
  color: string | null | undefined;
  size?: "sm" | "md";
}

const BOX_CLASSES = {
  sm: "flex size-9 shrink-0 items-center justify-center rounded-lg",
  md: "flex size-10 shrink-0 items-center justify-center rounded-lg",
} as const;

const ICON_CLASSES = {
  sm: "size-4",
  md: "size-5",
} as const;

// Background is the icon's own color at ~10% opacity ("1a" hex alpha) so the
// badge tint always matches the icon color, whatever it is, without a second
// palette to keep in sync.
export function IconBadge({ icon: Icon, color, size = "sm" }: IconBadgeProps) {
  return (
    <div
      className={BOX_CLASSES[size]}
      style={{ backgroundColor: color ? `${color}1a` : undefined }}
    >
      <Icon className={ICON_CLASSES[size]} style={{ color: color ?? undefined }} />
    </div>
  );
}
