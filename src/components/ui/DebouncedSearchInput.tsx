import { useEffect, useState } from "react";
import { Search } from "lucide-react";

type DebouncedSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delayMs?: number;
};

export function DebouncedSearchInput({
  value,
  onChange,
  placeholder,
  delayMs = 300,
}: DebouncedSearchInputProps) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    const normalizedDraft = draftValue.trim();

    if (normalizedDraft === value) {
      return;
    }

    const timerId = window.setTimeout(() => {
      onChange(normalizedDraft);
    }, delayMs);

    return () => window.clearTimeout(timerId);
  }, [delayMs, draftValue, onChange, value]);

  return (
    <label className="relative block min-w-0">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
      <input
        value={draftValue}
        placeholder={placeholder}
        onChange={(event) => setDraftValue(event.target.value)}
        className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-primary outline-none transition placeholder:text-muted focus:border-border-strong"
      />
    </label>
  );
}
