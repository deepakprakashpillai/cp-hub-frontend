import { type ReactNode, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type ModalProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
};

export function Modal({ title, isOpen, onClose, children, footer, size = "sm" }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/18 px-4 py-6 backdrop-blur-[1px]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close modal"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex max-h-[calc(100dvh-3rem)] w-full flex-col rounded-md border border-border bg-surface p-3 shadow-[0_18px_54px_rgba(15,23,42,0.16)]",
          size === "sm" ? "max-w-[23rem]" : size === "md" ? "max-w-[32rem]" : "max-w-[62rem]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="truncate pt-0.5 text-sm font-semibold text-primary">
            {title}
          </h2>
          <button
            type="button"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted transition hover:bg-surface-subtle hover:text-primary"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        <div className={cn("min-h-0 flex-1 pt-3", size === "lg" ? "overflow-y-auto pr-1" : "overflow-visible")}>{children}</div>
        {footer ? <div className="mt-3 flex items-center justify-end gap-1">{footer}</div> : null}
      </section>
    </div>,
    document.body,
  );
}
