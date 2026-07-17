import { User } from "@/shared/types";
import { AdvancedFilters } from "./AdvancedFiltersPanel";
import FilterPanelShell from "@/shared/components/FilterPanelShell";

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

interface LeadsFilterPanelProps {
  isAdvancedFilterOpen: boolean;
  advancedFilters: AdvancedFilters;
  setAdvancedFilters: React.Dispatch<React.SetStateAction<AdvancedFilters>>;
  users: User[];
  isManagerial: (role: string) => boolean;
}

export default function LeadsFilterPanel({
  isAdvancedFilterOpen,
  advancedFilters,
  setAdvancedFilters,
  users,
  isManagerial,
}: LeadsFilterPanelProps) {
  if (!isAdvancedFilterOpen) return null;

  const handleClearAll = () => {
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

  const handleFilterChange = (field: keyof AdvancedFilters, value: string) => {
    setAdvancedFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <FilterPanelShell
      className="mb-6 animate-fadeIn"
      title="Advanced Filters"
      actions={
        <button
          type="button"
          onClick={handleClearAll}
          className={`type-label text-xs font-semibold text-theme-danger hover:underline cursor-pointer border-0 bg-transparent rounded-theme px-1 ${FOCUS_RING}`}
        >
          Clear All
        </button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Lead Number
          </label>
          <input
            type="text"
            placeholder="Search Lead #"
            aria-label="Lead Number"
            value={advancedFilters.leadNumber || ""}
            onChange={(e) => handleFilterChange("leadNumber", e.target.value)}
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
            onChange={(e) => handleFilterChange("name", e.target.value)}
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
            onChange={(e) => handleFilterChange("phone", e.target.value)}
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
            onChange={(e) => handleFilterChange("email", e.target.value)}
            className={fieldClass(hasValue(advancedFilters.email))}
          />
        </div>

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Status
          </label>
          <select
            aria-label="Status"
            value={advancedFilters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className={`${fieldClass(hasValue(advancedFilters.status))} cursor-pointer`}
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="interested">Interested</option>
            <option value="site-visit-confirmed">Site Visit Confirmed</option>
            <option value="reserved">Reserved</option>
            <option value="booked">Booked</option>
            <option value="not-interested">Not Interested</option>
          </select>
        </div>

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Lead Source
          </label>
          <select
            aria-label="Lead Source"
            value={advancedFilters.source}
            onChange={(e) => handleFilterChange("source", e.target.value)}
            className={`${fieldClass(hasValue(advancedFilters.source))} cursor-pointer`}
          >
            <option value="">All Sources</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Meta Ads">Meta Ads</option>
            <option value="Direct Call">Direct Call</option>
            <option value="Referral">Referral</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Website">Website</option>
          </select>
        </div>

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Lead Medium
          </label>
          <select
            aria-label="Lead Medium"
            value={advancedFilters.leadMedium || ""}
            onChange={(e) => handleFilterChange("leadMedium", e.target.value)}
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

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Assigned To
          </label>
          <select
            aria-label="Assigned To"
            value={advancedFilters.assignedTo || ""}
            onChange={(e) => handleFilterChange("assignedTo", e.target.value)}
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

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Date Created
          </label>
          <select
            aria-label="Date Created preset"
            value={advancedFilters.dateRange}
            onChange={(e) => handleFilterChange("dateRange", e.target.value)}
            className={`${fieldClass(hasValue(advancedFilters.dateRange))} cursor-pointer`}
          >
            <option value="all">Any Preset Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Max Budget
          </label>
          <select
            aria-label="Max Budget"
            value={advancedFilters.budgetMax}
            onChange={(e) => handleFilterChange("budgetMax", e.target.value)}
            className={`${fieldClass(hasValue(advancedFilters.budgetMax))} cursor-pointer`}
          >
            <option value="">Any Budget</option>
            <option value="2500000">Up to ₹25L</option>
            <option value="5000000">Up to ₹50L</option>
            <option value="10000000">Up to ₹1Cr</option>
          </select>
        </div>

        <div>
          <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Created Date: From
          </label>
          <input
            type="date"
            aria-label="Created Date from"
            value={advancedFilters.createdDateStart || ""}
            onChange={(e) => handleFilterChange("createdDateStart", e.target.value)}
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
            onChange={(e) => handleFilterChange("createdDateEnd", e.target.value)}
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
            onChange={(e) => handleFilterChange("followUpStart", e.target.value)}
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
            onChange={(e) => handleFilterChange("followUpEnd", e.target.value)}
            className={fieldClass(hasValue(advancedFilters.followUpEnd))}
          />
        </div>
      </div>
    </FilterPanelShell>
  );
}
