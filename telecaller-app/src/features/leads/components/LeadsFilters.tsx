/**
 * @deprecated Wave 3 — not mounted on LeadsWorkspace.
 * Canonical Leads command surface: `LeadsWorkspace` + `LeadListDesktopFilterRow` /
 * `LeadListMobileFilterSheet` + `LeadListPresetStrip`. Presentation migrated to
 * FilterSearchInput so remounts are not gray/emoji islands.
 */
import { SlidersHorizontal } from "lucide-react";
import FilterSearchInput from "@/shared/components/FilterSearchInput";
import { AdvancedFilters } from "./AdvancedFiltersPanel";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

interface LeadsFiltersProps {
  leadSearchQuery: string;
  setLeadSearchQuery: (query: string) => void;
  leadsGrouping: "none" | "status" | "priority";
  setLeadsGrouping: (grouping: "none" | "status" | "priority") => void;
  leadsViewMode: "compact" | "normal";
  setLeadsViewMode: (mode: "compact" | "normal") => void;
  isAdvancedFilterOpen: boolean;
  setIsAdvancedFilterOpen: (open: boolean) => void;
  isManager: boolean;
  advancedFilters: AdvancedFilters;
}

/** @deprecated Prefer LeadsWorkspace filter stack. */
export default function LeadsFilters({
  leadSearchQuery,
  setLeadSearchQuery,
  leadsGrouping,
  setLeadsGrouping,
  leadsViewMode,
  setLeadsViewMode,
  isAdvancedFilterOpen,
  setIsAdvancedFilterOpen,
  isManager,
  advancedFilters,
}: LeadsFiltersProps) {
  const activeAdvancedFilterCount = Object.values(advancedFilters).filter(
    (v) => v !== "" && v !== "all"
  ).length;

  return (
    <div className="relative flex-1 flex flex-col sm:flex-row gap-2">
      <FilterSearchInput
        value={leadSearchQuery}
        onChange={setLeadSearchQuery}
        placeholder="Search leads by name, phone, plot interest..."
        aria-label="Search leads"
        className="flex-1"
      />
      <div className="flex gap-2 overflow-x-auto">
        <select
          value={leadsGrouping}
          onChange={(e) => setLeadsGrouping(e.target.value as "none" | "status" | "priority")}
          className={`px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-theme text-xs sm:text-sm font-semibold border border-theme-border bg-theme-card text-theme-text hover:bg-theme-surface cursor-pointer outline-none transition-colors ${FOCUS_RING}`}
          title="Group Leads By"
          aria-label="Group leads by"
        >
          <option value="status">Group: Status</option>
          <option value="priority">Group: Priority</option>
          <option value="none">List (No Grouping)</option>
        </select>
        <select
          value={leadsViewMode}
          onChange={(e) => setLeadsViewMode(e.target.value as "compact" | "normal")}
          className={`px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-theme text-xs sm:text-sm font-semibold border border-theme-border bg-theme-card text-theme-text hover:bg-theme-surface cursor-pointer outline-none transition-colors ${FOCUS_RING}`}
          title="Table View Mode"
          aria-label="Table view mode"
        >
          <option value="normal">Standard View</option>
          <option value="compact">Compact View</option>
        </select>
      </div>
      {isManager && (
        <button
          type="button"
          onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
          className={`px-4 py-2.5 rounded-theme text-sm font-semibold flex items-center gap-2 transition-colors border cursor-pointer ${FOCUS_RING} ${
            isAdvancedFilterOpen || activeAdvancedFilterCount > 0
              ? "bg-theme-accent-muted text-theme-accent border-theme-border"
              : "bg-theme-card text-theme-text border-theme-border hover:bg-theme-surface"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" aria-hidden />
          <span className="hidden sm:inline">Advanced Filters</span>
          {activeAdvancedFilterCount > 0 && (
            <span className="bg-theme-accent text-theme-accent-fg text-[10px] rounded-theme h-5 min-w-5 px-1.5 flex items-center justify-center font-semibold tabular-nums">
              {activeAdvancedFilterCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
