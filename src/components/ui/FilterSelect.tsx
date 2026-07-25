import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type FilterSelectOption = {
  value: string;
  label: string;
};

type FilterSelectProps = {
  label: string;
  value: string;
  options: FilterSelectOption[];
  onChange: (value: string) => void;
  includeAll?: boolean;
  allLabel?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
};

const allOption = { value: "", label: "All" };

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  includeAll = true,
  allLabel = "All",
  disabled,
  className,
  triggerClassName,
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const controlId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const allOptions = includeAll ? [{ ...allOption, label: allLabel }, ...options] : options;
  const fallbackOption = includeAll ? { ...allOption, label: allLabel } : (options[0] ?? allOption);
  const selectedOption = allOptions.find((option) => option.value === value) ?? fallbackOption;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function selectOption(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={controlId}
        type="button"
        className={cn(
          "flex h-8 min-w-32 items-center gap-2 rounded-md border border-border bg-surface px-2 text-left transition",
          "hover:border-border-strong hover:bg-surface-subtle/70 disabled:cursor-not-allowed disabled:opacity-60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20",
          triggerClassName,
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="text-[11px] font-medium text-muted">{label}</span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-primary">
          {selectedOption.label}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 text-muted transition", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 top-[calc(100%+0.35rem)] z-40 w-full min-w-40 rounded-md border border-border bg-surface p-1 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
          role="listbox"
          aria-labelledby={controlId}
        >
          {allOptions.map((option) => {
            const isSelected = option.value === selectedOption.value;

            return (
              <button
                key={option.value || "all"}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "flex h-7 w-full items-center justify-between gap-2 rounded px-2 text-left text-xs font-medium transition",
                  isSelected ? "bg-brand/8 text-primary" : "text-muted hover:bg-surface-subtle",
                )}
                onClick={() => selectOption(option.value)}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? (
                  <Check className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
