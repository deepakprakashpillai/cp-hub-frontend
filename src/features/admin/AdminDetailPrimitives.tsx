import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AdminDetailPanel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <h2 className="text-xs font-semibold text-primary">{title}</h2>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

export function AdminCompactField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        min={min}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs font-medium text-primary outline-none transition placeholder:text-muted focus:border-border-strong focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

export function AdminCompactToggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex h-8 items-center justify-between gap-3 rounded-md border border-border bg-surface px-2 transition hover:border-border-strong",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <span className="text-xs font-medium text-primary">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cn(
          "relative h-4 w-7 rounded-full border border-border-strong transition",
          checked ? "bg-brand/80" : "bg-surface-subtle",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-surface shadow-sm transition",
            checked ? "left-[0.85rem]" : "left-0.5",
          )}
        />
      </span>
    </label>
  );
}
