export const ITEMS_PER_PAGE = 21;
export const COLLECTIONS_PER_PAGE = 21;
export const DASHBOARD_COLLECTIONS_LIMIT = 6;
export const DASHBOARD_RECENT_ITEMS_LIMIT = 10;

export function parsePageParam(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

export function getTotalPages(totalCount: number, perPage: number): number {
  return Math.max(1, Math.ceil(totalCount / perPage));
}

export function clampPage(page: number, totalPages: number): number {
  const safePage = Number.isInteger(page) && page >= 1 ? page : 1;
  return Math.min(safePage, totalPages);
}

export type PaginationRangeItem = number | "ellipsis";

export function getPaginationRange(current: number, total: number): PaginationRangeItem[] {
  const SIBLING_COUNT = 1;
  const totalNumbersToShow = SIBLING_COUNT * 2 + 5;

  if (total <= totalNumbersToShow) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(current - SIBLING_COUNT, 1);
  const rightSibling = Math.min(current + SIBLING_COUNT, total);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  const range: PaginationRangeItem[] = [1];

  if (showLeftEllipsis) {
    range.push("ellipsis");
  } else {
    for (let page = 2; page < leftSibling; page++) range.push(page);
  }

  for (let page = leftSibling; page <= rightSibling; page++) {
    if (page !== 1 && page !== total) range.push(page);
  }

  if (showRightEllipsis) {
    range.push("ellipsis");
  } else {
    for (let page = rightSibling + 1; page < total; page++) range.push(page);
  }

  range.push(total);

  return range;
}
