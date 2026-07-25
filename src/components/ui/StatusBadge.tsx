import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatusBadgeTone = "blue" | "green" | "amber" | "indigo" | "rose" | "neutral";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusBadgeTone;
};

const statusBadgeToneClassNames: Record<StatusBadgeTone, string> = {
  blue: "bg-sky-50 text-primary dark:bg-sky-500/10",
  green: "bg-emerald-50 text-primary dark:bg-emerald-500/10",
  amber: "bg-amber-50 text-primary dark:bg-amber-500/10",
  indigo: "bg-indigo-50 text-primary dark:bg-indigo-500/10",
  rose: "bg-rose-50 text-primary dark:bg-rose-500/10",
  neutral: "bg-surface-subtle text-primary",
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium",
        statusBadgeToneClassNames[tone],
      )}
    >
      {children}
    </span>
  );
}
