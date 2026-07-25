import { type Row, type Table, flexRender } from "@tanstack/react-table";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type DataTableProps<TData> = {
  table: Table<TData>;
  isLoading?: boolean;
  isError?: boolean;
  loadingRows?: number;
  minWidth?: number;
  emptyMessage: string;
  errorMessage: string;
  onRetry?: () => void;
  onRowClick?: (row: Row<TData>) => void;
};

export function DataTable<TData>({
  table,
  isLoading = false,
  isError = false,
  loadingRows = 8,
  minWidth = 880,
  emptyMessage,
  errorMessage,
  onRetry,
  onRowClick,
}: DataTableProps<TData>) {
  if (isLoading) {
    return <DataTableLoadingRows rows={loadingRows} />;
  }

  if (isError) {
    return <DataTableErrorState message={errorMessage} onRetry={onRetry} />;
  }

  const rows = table.getRowModel().rows;

  if (rows.length === 0) {
    return <DataTableEmptyState message={emptyMessage} />;
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" style={{ minWidth }}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-surface-subtle">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 text-xs font-medium text-muted">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border transition last:border-b-0 hover:bg-surface-subtle/55",
                  onRowClick && "cursor-pointer",
                )}
                onClick={() => onRowClick?.(row)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DataTableLoadingRows({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-md border border-border bg-surface">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse border-b border-border last:border-b-0" />
      ))}
    </div>
  );
}

export function DataTableErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-md border border-danger bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <p className="text-sm font-medium text-primary">{message}</p>
        </div>
        {onRetry ? (
          <button
            type="button"
            className="h-8 rounded-md border border-border bg-background px-3 text-xs font-medium text-primary transition hover:bg-surface-subtle"
            onClick={onRetry}
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function DataTableEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-6">
      <p className="text-sm font-medium text-primary">{message}</p>
    </div>
  );
}
