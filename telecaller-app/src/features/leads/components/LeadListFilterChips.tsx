import { X } from "lucide-react";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

/**
 * Minimal chip shape for presentation. Leads `LeadFilterChip` (with `clear`) is compatible.
 * Canonical shared chip chrome — do not fork Admin/Lead-specific chip components.
 */
export interface FilterChipDisplay {
  id: string;
  label: string;
}

export interface LeadListFilterChipsProps<T extends FilterChipDisplay = FilterChipDisplay> {
  chips: T[];
  onClearChip: (chip: T) => void;
  onClearAll: () => void;
  /** Optional result count (Leads workspace). Omit for panels that only show chips. */
  resultCount?: number;
  className?: string;
}

export default function LeadListFilterChips<T extends FilterChipDisplay = FilterChipDisplay>({
  chips,
  onClearChip,
  onClearAll,
  resultCount,
  className = "",
}: LeadListFilterChipsProps<T>) {
  if (chips.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {typeof resultCount === "number" && (
        <span className="type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </span>
      )}
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onClearChip(chip)}
          aria-label={`Remove filter ${chip.label}`}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-theme text-[10px] font-semibold bg-theme-accent-muted text-theme-accent border border-theme-border cursor-pointer hover:opacity-90 transition-colors ${FOCUS_RING}`}
        >
          {chip.label}
          <X className="w-3 h-3" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className={`type-label text-[10px] font-semibold text-theme-danger hover:underline cursor-pointer border-0 bg-transparent px-1 py-1 rounded-theme ${FOCUS_RING}`}
      >
        Clear All
      </button>
    </div>
  );
}
