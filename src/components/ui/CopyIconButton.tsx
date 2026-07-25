import { useEffect, useRef, useState } from "react";
import { Check, Clipboard } from "lucide-react";

type CopyIconButtonProps = {
  value: string;
  label: string;
};

export function CopyIconButton({ value, label }: CopyIconButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  async function copyValue() {
    await navigator.clipboard?.writeText(value);
    setCopied(true);

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      resetTimerRef.current = null;
    }, 2000);
  }

  return (
    <button
      type="button"
      className="inline-grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-surface-subtle hover:text-primary"
      onClick={copyValue}
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
      title={copied ? `Copied ${label}` : `Copy ${label}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
      ) : (
        <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </button>
  );
}
