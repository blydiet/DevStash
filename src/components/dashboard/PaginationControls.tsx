import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from "@/components/ui/pagination";
import { getPaginationRange } from "@/lib/pagination";
import { cn } from "@/lib/utils";

function BoundaryLink({
  href,
  disabled,
  direction,
}: {
  href: string;
  disabled: boolean;
  direction: "previous" | "next";
}) {
  const className = cn(
    buttonVariants({ variant: "ghost", size: "default" }),
    direction === "previous" ? "pl-1.5!" : "pr-1.5!",
    disabled && "pointer-events-none opacity-50",
  );
  const label = direction === "previous" ? "Previous" : "Next";
  const content =
    direction === "previous" ? (
      <>
        <ChevronLeftIcon data-icon="inline-start" />
        <span className="hidden sm:block">{label}</span>
      </>
    ) : (
      <>
        <span className="hidden sm:block">{label}</span>
        <ChevronRightIcon data-icon="inline-end" />
      </>
    );

  if (disabled) {
    return (
      <span aria-disabled="true" className={className}>
        {content}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={`Go to ${direction} page`} className={className}>
      {content}
    </Link>
  );
}

export function PaginationControls({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  const range = getPaginationRange(currentPage, totalPages);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <BoundaryLink
            href={`${basePath}?page=${currentPage - 1}`}
            disabled={currentPage <= 1}
            direction="previous"
          />
        </PaginationItem>

        {range.map((page, index) =>
          page === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <Link
                href={`${basePath}?page=${page}`}
                aria-current={page === currentPage ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: page === currentPage ? "outline" : "ghost", size: "icon" }),
                )}
              >
                {page}
              </Link>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <BoundaryLink
            href={`${basePath}?page=${currentPage + 1}`}
            disabled={currentPage >= totalPages}
            direction="next"
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
