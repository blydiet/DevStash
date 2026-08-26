import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/user";
import type { ItemTypeSummary } from "@/lib/db/items-queries";

export interface ItemStats {
  total: number;
  favorites: number;
}

export interface ItemTypeWithCount extends ItemTypeSummary {
  itemCount: number;
}

export async function getItemTypeByName(typeName: string): Promise<ItemTypeSummary | null> {
  const type = await prisma.itemType.findFirst({
    where: { name: typeName, isSystem: true },
  });

  if (!type) return null;

  return { id: type.id, name: type.name, icon: type.icon, color: type.color };
}

export async function getItemStats(): Promise<ItemStats> {
  const userId = await getCurrentUserId();
  const [total, favorites] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
  ]);

  return { total, favorites };
}

const ITEM_TYPE_ORDER = ["snippet", "prompt", "command", "note", "file", "image", "link"];

export async function getItemTypes(): Promise<ItemTypeWithCount[]> {
  const userId = await getCurrentUserId();
  const types = await prisma.itemType.findMany({
    where: { isSystem: true },
    include: {
      _count: {
        select: { items: { where: { userId } } },
      },
    },
  });

  types.sort((a, b) => ITEM_TYPE_ORDER.indexOf(a.name) - ITEM_TYPE_ORDER.indexOf(b.name));

  return types.map((type) => ({
    id: type.id,
    name: type.name,
    icon: type.icon,
    color: type.color,
    itemCount: type._count.items,
  }));
}
