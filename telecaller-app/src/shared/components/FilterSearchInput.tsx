import type { KeyboardEventHandler } from "react";
import { Search } from "lucide-react";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

export interface FilterSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Required for a11y — defaults to placeholder or "Search" */
  "aria-label"?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
  disabled?: boolean;
  name?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}

/**
 * Shared search chrome for command surfaces (DataTable toolbar, Admin filter bars).
 * Presentation only — caller owns query / apply / page-reset wiring.
 */
export default function FilterSearchInput({
  value,
  onChange,
  placeholder = "Search...",
  "aria-label": ariaLabel,
  className = "",
  inputClassName = "",
  id,
  disabled,
  name,
  onKeyDown,
}: FilterSearchInputProps) {
  const label = ariaLabel || placeholder || "Search";

  return (
    <div className={`relative flex items-center min-w-0 ${className}`}>
      <Search
        className="absolute left-3 h-4 w-4 text-theme-muted pointer-events-none"
        aria-hidden
      />
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={`w-full h-10 pl-9 pr-4 bg-theme-card border border-theme-border rounded-theme text-xs sm:text-sm text-theme-text placeholder:text-theme-muted transition-colors ${FOCUS_RING} ${inputClassName}`}
      />
    </div>
  );
}
