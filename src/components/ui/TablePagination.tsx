import { ArrowLeft, ArrowRight } from "lucide-react";

type TablePaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
};

export function TablePagination({
  page,
  totalPages,
  total,
  itemLabel,
  onPageChange,
}: TablePaginationProps) {
  return (
    <div className="flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
      <p>
        {total} {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="inline-grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-surface-subtle hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="px-2">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="inline-grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-surface-subtle hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
