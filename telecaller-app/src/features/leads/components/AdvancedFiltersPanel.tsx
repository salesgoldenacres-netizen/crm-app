/**
 * @deprecated Wave 3 — not mounted on LeadsWorkspace or AdminLeadsTab.
 * Canonical Admin panel: `LeadsFilterPanel`. Canonical work queues: `LeadListPresetStrip`.
 * Kept for `AdvancedFilters` type export and any legacy imports. Presentation aligned to
 * FilterPanelShell so remounts are not gray/indigo islands.
 */
import FilterPanelShell from "@/shared/components/FilterPanelShell";
import { User } from "@/shared/types";

export interface AdvancedFilters {
  status: string;
  source: string;
  dateRange: string;
  budgetMax: string;
  leadNumber: string;
  name: string;
  phone: string;
  email: string;
  leadMedium: string;
  assignedTo: string;
  projectId: string;
  priority: string;
  createdDateStart: string;
  createdDateEnd: string;
  followUpStart: string;
  followUpEnd: string;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

function fieldClass(filled: boolean) {
  return `w-full text-xs border rounded-theme px-2.5 py-2 outline-none transition-colors ${FOCUS_RING} ${
    filled
      ? "border-theme-accent/50 bg-theme-accent/10 text-theme-text"
      : "border-theme-border bg-theme-card text-theme-text placeholder:text-theme-muted/70"
  }`;
}

function hasValue(v: string | undefined) {
  return v != null && String(v).trim() !== "" && v !== "all";
}

interface AdvancedFiltersPanelProps {
  isOpen: boolean;
  advancedFilters: AdvancedFilters;
  setAdvancedFilters: React.Dispatch<React.SetStateAction<AdvancedFilters>>;
  shouldHideLeadSource: boolean;
  users?: User[];
  isManagerial?: (role: string) => boolean;
  user?: User;
}

/** @deprecated Prefer `LeadsFilterPanel` for Admin advanced filters. */
export default function AdvancedFiltersPanel({
  isOpen,
  advancedFilters,
  setAdvancedFilters,
  shouldHideLeadSource,
  users = [],
  isManagerial,
  user,
}: AdvancedFiltersPanelProps) {
  if (!isOpen) return null;

  const handleClear = () => {
    setAdvancedFilters({
      status: "",
      source: "",
      dateRange: "all",
      budgetMax: "",
      leadNumber: "",
      name: "",
      phone: "",
      email: "",
      leadMedium: "",
      assignedTo: "",
      createdDateStart: "",
      createdDateEnd: "",
      followUpStart: "",
      followUpEnd: "",
      projectId: "",
      priority: "",
    });
  };

  const patch = (partial: Partial<AdvancedFilters>) =>
    setAdvancedFilters((prev) => ({ ...prev, ...partial }));

  return (
    <FilterPanelShell
      className="mb-6"
      title="Advanced Filtering"
      actions={
        <button
          type="button"
          onClick={handleClear}
          className={`type-label text-xs font-semibold text-theme-danger hover:underline cursor-pointer border-0 bg-transparent rounded-theme px-1 ${FOCUS_RING}`}
        >
          Clear All
        </button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Lead Number
          </label>
          <input
            type="text"
            placeholder="Search Lead #"
            aria-label="Lead Number"
            value={advancedFilters.leadNumber || ""}
            onChange={(e) => patch({ leadNumber: e.target.value })}
            className={fieldClass(hasValue(advancedFilters.leadNumber))}
          />
        </div>

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Customer Name
          </label>
          <input
            type="text"
            placeholder="Search Name"
            aria-label="Customer Name"
            value={advancedFilters.name || ""}
            onChange={(e) => patch({ name: e.target.value })}
            className={fieldClass(hasValue(advancedFilters.name))}
          />
        </div>

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Mobile Phone
          </label>
          <input
            type="text"
            placeholder="Search Phone"
            aria-label="Mobile Phone"
            value={advancedFilters.phone || ""}
            onChange={(e) => patch({ phone: e.target.value })}
            className={fieldClass(hasValue(advancedFilters.phone))}
          />
        </div>

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Email
          </label>
          <input
            type="text"
            placeholder="Search Email"
            aria-label="Email"
            value={advancedFilters.email || ""}
            onChange={(e) => patch({ email: e.target.value })}
            className={fieldClass(hasValue(advancedFilters.email))}
          />
        </div>

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Lead Status
          </label>
          <select
            aria-label="Lead Status"
            value={advancedFilters.status}
            onChange={(e) => patch({ status: e.target.value })}
            className={`${fieldClass(hasValue(advancedFilters.status))} cursor-pointer`}
          >
            <option value="">Any Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="interested">Interested</option>
            <option value="site-visit-confirmed">Site Visit Confirmed</option>
            <option value="reserved">Reserved</option>
            <option value="booked">Booked</option>
            <option value="not-interested">Not Interested</option>
          </select>
        </div>

        {!shouldHideLeadSource && (
          <div>
            <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
              Lead Source
            </label>
            <select
              aria-label="Lead Source"
              value={advancedFilters.source}
              onChange={(e) => patch({ source: e.target.value })}
              className={`${fieldClass(hasValue(advancedFilters.source))} cursor-pointer`}
            >
              <option value="">Any Source</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Meta Ads">Meta Ads</option>
              <option value="Direct Call">Direct Call</option>
              <option value="Referral">Referral</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Website">Website</option>
            </select>
          </div>
        )}

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Lead Medium
          </label>
          <select
            aria-label="Lead Medium"
            value={advancedFilters.leadMedium || ""}
            onChange={(e) => patch({ leadMedium: e.target.value })}
            className={`${fieldClass(hasValue(advancedFilters.leadMedium))} cursor-pointer`}
          >
            <option value="">Any Medium</option>
            <option value="CPC">CPC</option>
            <option value="Organic">Organic</option>
            <option value="Referral">Referral</option>
            <option value="Social">Social</option>
            <option value="Direct">Direct</option>
          </select>
        </div>

        {isManagerial && isManagerial(user?.role || "") && (
          <div>
            <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
              Assigned To
            </label>
            <select
              aria-label="Assigned To"
              value={advancedFilters.assignedTo || ""}
              onChange={(e) => patch({ assignedTo: e.target.value })}
              className={`${fieldClass(hasValue(advancedFilters.assignedTo))} cursor-pointer`}
            >
              <option value="">Any Agent</option>
              {users
                .filter((u) => !isManagerial(u.role))
                .map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.username}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Date Created
          </label>
          <select
            aria-label="Date Created preset"
            value={advancedFilters.dateRange}
            onChange={(e) => patch({ dateRange: e.target.value })}
            className={`${fieldClass(hasValue(advancedFilters.dateRange))} cursor-pointer`}
          >
            <option value="all">Any Preset Time</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Budget Limit (Lakhs)
          </label>
          <input
            type="number"
            placeholder="e.g. 50"
            aria-label="Budget Limit"
            value={advancedFilters.budgetMax}
            onChange={(e) => patch({ budgetMax: e.target.value })}
            className={fieldClass(hasValue(advancedFilters.budgetMax))}
          />
        </div>

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Created Date: From
          </label>
          <input
            type="date"
            aria-label="Created Date from"
            value={advancedFilters.createdDateStart || ""}
            onChange={(e) => patch({ createdDateStart: e.target.value })}
            className={fieldClass(hasValue(advancedFilters.createdDateStart))}
          />
        </div>

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Created Date: To
          </label>
          <input
            type="date"
            aria-label="Created Date to"
            value={advancedFilters.createdDateEnd || ""}
            onChange={(e) => patch({ createdDateEnd: e.target.value })}
            className={fieldClass(hasValue(advancedFilters.createdDateEnd))}
          />
        </div>

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Follow Up Date: From
          </label>
          <input
            type="date"
            aria-label="Follow Up Date from"
            value={advancedFilters.followUpStart || ""}
            onChange={(e) => patch({ followUpStart: e.target.value })}
            className={fieldClass(hasValue(advancedFilters.followUpStart))}
          />
        </div>

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Follow Up Date: To
          </label>
          <input
            type="date"
            aria-label="Follow Up Date to"
            value={advancedFilters.followUpEnd || ""}
            onChange={(e) => patch({ followUpEnd: e.target.value })}
            className={fieldClass(hasValue(advancedFilters.followUpEnd))}
          />
        </div>
      </div>
    </FilterPanelShell>
  );
}
