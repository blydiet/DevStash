import { prisma } from "@/lib/prisma";

const DEMO_EMAIL = "demo@devstash.io";

export interface ItemTypeSummary {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface ItemSummary {
  id: string;
  title: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: Date;
  type: ItemTypeSummary;
  tags: string[];
}

export interface ItemStats {
  total: number;
  favorites: number;
}

export interface ItemTypeWithCount extends ItemTypeSummary {
  itemCount: number;
}

type PrismaItemWithRelations = {
  id: string;
  title: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: Date;
  type: ItemTypeSummary;
  tags: { tag: { name: string } }[];
};

function toItemSummary(item: PrismaItemWithRelations): ItemSummary {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    createdAt: item.createdAt,
    type: item.type,
    tags: item.tags.map(({ tag }) => tag.name),
  };
}

export async function getPinnedItems(): Promise<ItemSummary[]> {
  const items = await prisma.item.findMany({
    where: { user: { email: DEMO_EMAIL }, isPinned: true },
    orderBy: { updatedAt: "desc" },
    include: { type: true, tags: { include: { tag: true } } },
  });

  return items.map(toItemSummary);
}

export async function getRecentItems(limit = 10): Promise<ItemSummary[]> {
  const items = await prisma.item.findMany({
    where: { user: { email: DEMO_EMAIL } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { type: true, tags: { include: { tag: true } } },
  });

  return items.map(toItemSummary);
}

export async function getItemStats(): Promise<ItemStats> {
  const [total, favorites] = await Promise.all([
    prisma.item.count({ where: { user: { email: DEMO_EMAIL } } }),
    prisma.item.count({ where: { user: { email: DEMO_EMAIL }, isFavorite: true } }),
  ]);

  return { total, favorites };
}

const ITEM_TYPE_ORDER = ["snippet", "prompt", "command", "note", "file", "image", "link"];

export async function getItemTypes(): Promise<ItemTypeWithCount[]> {
  const types = await prisma.itemType.findMany({
    where: { isSystem: true },
    include: {
      _count: {
        select: { items: { where: { user: { email: DEMO_EMAIL } } } },
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
