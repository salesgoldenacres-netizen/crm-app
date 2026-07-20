import {
  LEAD_LIST_PRESETS,
  LeadListPresetId,
} from "@/features/leads/config/leadListFilterConfig";

interface LeadListPresetStripProps {
  activePresetId: LeadListPresetId | "custom";
  onSelect: (id: LeadListPresetId) => void;
}

/** Work-queue chips — flush inside command bar (no nested card chrome). */
export default function LeadListPresetStrip({
  activePresetId,
  onSelect,
}: LeadListPresetStripProps) {
  return (
    <div
      className="inline-flex items-center gap-0.5 p-0.5 rounded-theme bg-theme-surface overflow-x-auto max-w-full scrollbar-none"
      role="tablist"
      aria-label="Work queues"
    >
      {LEAD_LIST_PRESETS.map((preset) => {
        const active = activePresetId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(preset.id)}
            className={`shrink-0 inline-flex items-center min-h-11 px-2.5 py-2 sm:min-h-0 sm:py-1.5 rounded-theme text-[11px] font-semibold transition-colors cursor-pointer border-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
              active
                ? "bg-theme-card text-theme-accent shadow-sm"
                : "bg-transparent text-theme-muted hover:text-theme-text"
            }`}
          >
            {preset.label}
          </button>
        );
      })}
      {activePresetId === "custom" && (
        <span className="shrink-0 px-2.5 py-1.5 rounded-theme text-[11px] font-semibold text-theme-muted border border-dashed border-theme-border ml-0.5">
          Custom
        </span>
      )}
    </div>
  );
}
