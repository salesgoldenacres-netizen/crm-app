import { Search, RotateCcw } from "lucide-react";
import {
  LEAD_FILTER_FIELDS,
  LeadListFilters,
  isLeadListFiltersEmpty,
} from "@/features/leads/config/leadListFilterConfig";
import LeadFilterFieldControl from "./LeadFilterFieldControl";
import { User, Project } from "@/shared/types";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

interface LeadListDesktopFilterRowProps {
  draftFilters: LeadListFilters;
  onChange: (patch: Partial<LeadListFilters>) => void;
  onSearch: () => void;
  onReset: () => void;
  users: User[];
  projects: Record<string, Project>;
  leadsViewMode: "compact" | "normal";
  isManagerial: boolean;
  shouldHideEmail: boolean;
  shouldHideLeadSource: boolean;
}

export default function LeadListDesktopFilterRow({
  draftFilters,
  onChange,
  onSearch,
  onReset,
  users,
  projects,
  leadsViewMode,
  isManagerial,
  shouldHideEmail,
  shouldHideLeadSource,
}: LeadListDesktopFilterRowProps) {
  const compact = leadsViewMode === "compact";
  const pad = compact ? "px-1 py-1" : "px-1.5 py-1";
  const dirty = !isLeadListFiltersEmpty(draftFilters);

  const fieldByColumn = (column: string) =>
    LEAD_FILTER_FIELDS.find((f) => f.column === column);

  const renderField = (column: string) => {
    const field = fieldByColumn(column);
    if (!field) return <td className={pad} />;
    if (field.managerOnly && !isManagerial) return <td className={pad} />;
    if (field.hideIfNoEmail && shouldHideEmail) return <td className={pad} />;
    if (field.hideIfNoSource && shouldHideLeadSource) return <td className={pad} />;
    if (field.normalViewOnly && compact) return null;
    if (field.skipInCompact && compact) return null;

    return (
      <td className={pad}>
        <LeadFilterFieldControl
          field={field}
          value={draftFilters}
          onChange={onChange}
          users={users}
          projects={projects}
          dense
          onEnterSearch={onSearch}
        />
      </td>
    );
  };

  return (
    <tr className="bg-theme-surface/80 border-b border-theme-border">
      <td className={pad}>
        <div className="inline-flex items-center gap-0.5">
          <button
            type="button"
            onClick={onSearch}
            title="Search (Enter)"
            aria-label="Search"
            className={`inline-flex items-center justify-center h-6 rounded-theme bg-theme-accent text-theme-accent-fg text-[10px] font-semibold cursor-pointer border-0 ${FOCUS_RING} ${
              compact ? "w-6 px-0" : "gap-1 px-2"
            }`}
          >
            <Search className="w-3 h-3" aria-hidden />
            {!compact && <span>Search</span>}
          </button>
          <button
            type="button"
            onClick={onReset}
            title="Reset filters"
            aria-label="Reset filters"
            disabled={!dirty}
            className={`inline-flex items-center justify-center w-6 h-6 rounded-theme border border-theme-border bg-theme-card text-theme-muted hover:text-theme-text disabled:opacity-35 disabled:cursor-default cursor-pointer ${FOCUS_RING}`}
          >
            <RotateCcw className="w-3 h-3" aria-hidden />
          </button>
        </div>
      </td>
      {renderField("leadNumber")}
      {!compact && renderField("created")}
      {renderField("name")}
      {!compact && (
        <>
          {renderField("phone")}
          {renderField("email")}
          {renderField("source")}
          {renderField("medium")}
        </>
      )}
      {compact && renderField("source")}
      {renderField("status")}
      <td className={pad} />
      {renderField("followUp")}
      {renderField("assignedTo")}
      {!compact && <td className={pad} />}
      <td className={pad} />
    </tr>
  );
}
