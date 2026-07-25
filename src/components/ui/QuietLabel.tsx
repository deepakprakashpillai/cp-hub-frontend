import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type QuietLabelTone = "default" | "muted" | "danger" | "brand";

type QuietLabelProps = {
  children: ReactNode;
  tone?: QuietLabelTone;
};

export function QuietLabel({ children, tone = "default" }: QuietLabelProps) {
  return (
    <span
      className={cn(
        "inline-flex text-xs font-medium",
        tone === "default" && "text-primary",
        tone === "muted" && "text-muted",
        tone === "danger" && "text-danger",
        tone === "brand" && "text-brand",
      )}
    >
      {children}
    </span>
  );
}
