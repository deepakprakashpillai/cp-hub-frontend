import { LayoutGrid, Table2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type DataViewMode = "table" | "cards";

type DataViewToggleProps = {
  value: DataViewMode;
  onChange: (value: DataViewMode) => void;
  className?: string;
};

const viewOptions = [
  { value: "table", label: "Table", icon: Table2 },
  { value: "cards", label: "Cards", icon: LayoutGrid },
] satisfies Array<{ value: DataViewMode; label: string; icon: typeof Table2 }>;

export function DataViewToggle({ value, onChange, className }: DataViewToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex h-8 items-center rounded-md border border-border bg-surface px-0.5",
        className,
      )}
    >
      {viewOptions.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "relative inline-grid h-7 w-8 place-items-center rounded text-muted transition hover:bg-surface-subtle/60 hover:text-primary",
              isActive && "text-primary",
            )}
            onClick={() => onChange(option.value)}
            aria-label={`${option.label} view`}
            title={`${option.label} view`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {isActive ? <span className="absolute inset-x-2 bottom-0 h-px bg-brand" /> : null}
          </button>
        );
      })}
    </div>
  );
}
