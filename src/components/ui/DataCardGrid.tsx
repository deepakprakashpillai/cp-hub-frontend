import { type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type DataCardGridProps<TData> = {
  items: TData[];
  getKey: (item: TData) => string;
  renderCard: (item: TData) => ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  loadingCards?: number;
  emptyMessage: string;
  errorMessage: string;
  onRetry?: () => void;
  className?: string;
};

export function DataCardGrid<TData>({
  items,
  getKey,
  renderCard,
  isLoading = false,
  isError = false,
  loadingCards = 6,
  emptyMessage,
  errorMessage,
  onRetry,
  className,
}: DataCardGridProps<TData>) {
  if (isLoading) {
    return <DataCardGridLoading cards={loadingCards} className={className} />;
  }

  if (isError) {
    return <DataCardGridError message={errorMessage} onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return <DataCardGridEmpty message={emptyMessage} />;
  }

  return (
    <div className={cn("grid gap-2", className ?? "md:grid-cols-2 2xl:grid-cols-3")}>
      {items.map((item) => (
        <div key={getKey(item)}>{renderCard(item)}</div>
      ))}
    </div>
  );
}

export function DataCardGridLoading({
  cards = 6,
  className,
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className ?? "md:grid-cols-2 2xl:grid-cols-3")}>
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="aspect-[3/4] animate-pulse rounded-md border border-border bg-surface"
        />
      ))}
    </div>
  );
}

export function DataCardGridError({ message, onRetry }: { message: string; onRetry?: () => void }) {
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

export function DataCardGridEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-6">
      <p className="text-sm font-medium text-primary">{message}</p>
    </div>
  );
}
