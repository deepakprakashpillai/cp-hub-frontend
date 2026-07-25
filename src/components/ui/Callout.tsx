import { type ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

export type CalloutTone = "danger" | "warning" | "success" | "info";

export interface CalloutProps {
  title: string;
  children?: ReactNode;
  tone?: CalloutTone;
  className?: string;
}

const toneMap = {
  danger: {
    border: "border-l-danger",
    icon: AlertCircle,
    iconColor: "text-danger",
  },
  warning: {
    border: "border-l-amber-500",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
  },
  success: {
    border: "border-l-emerald-500",
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
  },
  info: {
    border: "border-l-brand",
    icon: Info,
    iconColor: "text-brand",
  },
};

export function Callout({ title, children, tone = "info", className }: CalloutProps) {
  const config = toneMap[tone];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-md border border-border bg-surface p-4 shadow-sm border-l-[3px]",
        config.border,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.iconColor)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        {children ? (
          <div className="mt-1 text-xs leading-5 text-muted">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
