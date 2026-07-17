import { useMemo, useState } from "react";
import {
  PhoneCall,
  PlusCircle,
  Filter,
  LayoutGrid,
  Rows3,
} from "lucide-react";
import { useToast } from "@/shared/components/Toast";
import EmptyState from "@/shared/components/ui/EmptyState";
import BulkActionsPanel from "./BulkActionsPanel";
import LeadsDesktopTable from "./LeadsDesktopTable";
import LeadsMobileGrid from "./LeadsMobileGrid";
import LeadListPresetStrip from "./LeadListPresetStrip";
import LeadListFilterChips from "./LeadListFilterChips";
import LeadListMobileFilterSheet from "./LeadListMobileFilterSheet";
import {
  LeadFilterChip,
  LeadListFilters,
  LeadListPresetId,
  countActiveLeadFilters,
} from "@/features/leads/config/leadListFilterConfig";
import { User, Lead, Project } from "@/shared/types";
import { rankPowerDialerQueue } from "@/features/leads/intelligence";
import DailyPrioritiesStrip from "./DailyPrioritiesStrip";

interface LeadsWorkspaceProps {
  user: User;
  users: User[];
  myLeads: Lead[];
  projects: Record<string, Project>;
  isManagerial: (role: string) => boolean;

  draftFilters: LeadListFilters;
  appliedFilters: LeadListFilters;
  activePresetId: LeadListPresetId | "custom";
  updateDraft: (patch: Partial<LeadListFilters>) => void;
  applySearch: () => void;
  resetFilters: () => void;
  applyPreset: (id: LeadListPresetId) => void;
  clearChip: (chip: LeadFilterChip) => void;
  clearAllChips: () => void;
  getChips: (users: User[], projectNames: Record<string, string>) => LeadFilterChip[];

  leadsGrouping: "none" | "status" | "priority";
  collapsedGroups: Record<string, boolean>;
  setCollapsedGroups:
    | React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    | ((groups: Record<string, boolean>) => void);
  leadsViewMode: "compact" | "normal";
  setLeadsViewMode: (mode: "compact" | "normal") => void;
  selectedLeadIds: string[];
  setSelectedLeadIds:
    | React.Dispatch<React.SetStateAction<string[]>>
    | ((ids: string[]) => void);

  isPowerDialerActive: boolean;
  setIsPowerDialerActive: (active: boolean) => void;
  bulkAssignee: string;
  setBulkAssignee: (assignee: string) => void;
  bulkStatus: string;
  setBulkStatus: (status: string) => void;

  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent, lead: Lead) => void;
  setCallLogForm: (form: any) => void;
  onAddLeadClick: () => void;
  setActiveLead: (lead: Lead) => void;
  bulkUpdateLeads: (ids: string[], updates: Partial<Lead>) => Promise<void>;
  isLeadIdle: (lead: Lead) => boolean;
  safeFormatDateTime: (dateStr?: string, showTime?: boolean) => string;
  shouldHideEmail: boolean;
  shouldHideLeadSource: boolean;
  todayStr: string;
  logCall: (leadId: string, logData: any) => Promise<void>;
  archiveLeads: (ids: string[], username: string) => Promise<void>;
}

export default function LeadsWorkspace({
  user,
  users,
  myLeads,
  projects,
  isManagerial,
  draftFilters,
  appliedFilters,
  activePresetId,
  updateDraft,
  applySearch,
  resetFilters,
  applyPreset,
  clearChip,
  clearAllChips,
  getChips,
  leadsGrouping,
  collapsedGroups,
  setCollapsedGroups,
  leadsViewMode,
  setLeadsViewMode,
  selectedLeadIds,
  setSelectedLeadIds,
  isPowerDialerActive,
  setIsPowerDialerActive,
  bulkAssignee,
  setBulkAssignee,
  bulkStatus,
  setBulkStatus,
  handleTouchStart,
  handleTouchEnd,
  setCallLogForm,
  onAddLeadClick,
  setActiveLead,
  bulkUpdateLeads,
  isLeadIdle,
  safeFormatDateTime,
  shouldHideEmail,
  shouldHideLeadSource,
  todayStr,
  logCall,
  archiveLeads,
}: LeadsWorkspaceProps) {
  const { toast } = useToast();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isManager = isManagerial(user?.role || "");

  const projectNames = useMemo(() => {
    const map: Record<string, string> = {};
    Object.values(projects).forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [projects]);

  const chips = getChips(users, projectNames);
  const activeCount = countActiveLeadFilters(appliedFilters);

  const togglePowerDialer = () => {
    const nextVal = !isPowerDialerActive;
    setIsPowerDialerActive(nextVal);
    if (nextVal && myLeads.length > 0) {
      const rankedIds = rankPowerDialerQueue(myLeads, {
        todayYmd: todayStr,
        isManagerial: isManager,
      });
      sessionStorage.setItem("isPowerDialerActive", "true");
      sessionStorage.setItem(
        "powerDialerQueue",
        JSON.stringify(rankedIds.length > 0 ? rankedIds : myLeads.map((l) => l.id))
      );
      toast("Auto-dialer queue on — ranked by priority", "success");
    } else {
      sessionStorage.removeItem("isPowerDialerActive");
      sessionStorage.removeItem("powerDialerQueue");
      if (!nextVal) toast("Auto-dialer paused", "info");
    }
  };

  return (
    <div className="flex flex-col gap-3 text-theme-text min-h-0">
      <DailyPrioritiesStrip
        leads={myLeads}
        user={user}
        todayYmd={todayStr}
        limit={8}
      />

      {/* Command bar */}
      <div className="shrink-0 rounded-theme border border-theme-border bg-theme-surface px-3 py-2.5 space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3">
          <div className="flex items-center justify-between gap-3 min-w-0 lg:shrink-0">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-semibold text-theme-text tracking-tight">Leads</h2>
                <span className="text-[11px] font-semibold text-theme-muted tabular-nums">
                  {myLeads.length.toLocaleString()} shown
                  {activeCount > 0
                    ? ` · ${activeCount} filter${activeCount === 1 ? "" : "s"}`
                    : ""}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onAddLeadClick}
              className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-theme text-[11px] font-semibold text-theme-accent-fg bg-theme-accent cursor-pointer border-0 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
            >
              <PlusCircle className="w-3.5 h-3.5" aria-hidden />
              Add
            </button>
          </div>

          <div className="min-w-0 overflow-x-auto scrollbar-none lg:flex-1">
            <LeadListPresetStrip activePresetId={activePresetId} onSelect={applyPreset} />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap lg:flex-nowrap justify-end shrink-0">
            <button
              type="button"
              onClick={() =>
                setLeadsViewMode(leadsViewMode === "compact" ? "normal" : "compact")
              }
              className="hidden md:inline-flex items-center gap-1 px-2 py-1.5 rounded-theme border border-theme-border bg-theme-card text-[11px] font-semibold text-theme-muted hover:text-theme-text cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              title="Toggle row density"
            >
              {leadsViewMode === "compact" ? (
                <Rows3 className="w-3.5 h-3.5" aria-hidden />
              ) : (
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
              )}
              {leadsViewMode === "compact" ? "Compact" : "Comfortable"}
            </button>

            <button
              type="button"
              onClick={togglePowerDialer}
              title="Auto-dialer queue"
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-theme border text-[11px] font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                isPowerDialerActive
                  ? "border-theme-success/40 bg-theme-success/15 text-theme-success"
                  : "border-theme-border bg-theme-card text-theme-muted hover:text-theme-text"
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" aria-hidden />
              <span className="hidden sm:inline">
                {isPowerDialerActive ? "Dialer On" : "Dialer"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-theme border border-theme-border bg-theme-card text-[11px] font-semibold text-theme-text cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
            >
              <Filter className="w-3.5 h-3.5 text-theme-accent" aria-hidden />
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>

            <button
              type="button"
              onClick={onAddLeadClick}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-theme text-[11px] font-semibold text-theme-accent-fg bg-theme-accent cursor-pointer border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
            >
              <PlusCircle className="w-3.5 h-3.5" aria-hidden />
              Add Lead
            </button>
          </div>
        </div>

        {chips.length > 0 && (
          <LeadListFilterChips
            chips={chips}
            onClearChip={clearChip}
            onClearAll={clearAllChips}
            resultCount={myLeads.length}
          />
        )}
      </div>

      {/* Table is the primary surface */}
      <div className="min-h-0 rounded-theme border border-theme-border bg-theme-card overflow-hidden">
        <LeadsDesktopTable
          myLeads={myLeads}
          selectedLeadIds={selectedLeadIds}
          setSelectedLeadIds={setSelectedLeadIds}
          leadsViewMode={leadsViewMode}
          leadsGrouping={leadsGrouping}
          collapsedGroups={collapsedGroups}
          setCollapsedGroups={setCollapsedGroups}
          projects={projects}
          todayStr={todayStr}
          isLeadIdle={isLeadIdle}
          shouldHideEmail={shouldHideEmail}
          shouldHideLeadSource={shouldHideLeadSource}
          logCall={logCall}
          setActiveLead={setActiveLead}
          setCallLogForm={setCallLogForm}
          user={user}
          toast={toast}
          safeFormatDateTime={safeFormatDateTime}
          archiveLeads={archiveLeads}
          users={users}
          isManagerialRole={isManager}
          draftFilters={draftFilters}
          onDraftChange={updateDraft}
          onSearch={applySearch}
          onReset={resetFilters}
        />

        <LeadsMobileGrid
          myLeads={myLeads}
          projects={projects}
          todayStr={todayStr}
          handleTouchStart={handleTouchStart}
          handleTouchEnd={handleTouchEnd}
        />

        {myLeads.length === 0 && (
          <div className="border-t border-theme-border p-4">
            <EmptyState
              variant="compact"
              preset="search"
              title="No matching leads"
              description="Adjust the filter row and Search, pick a work queue, or reset to see everything."
              className="border-0 bg-transparent shadow-none"
              action={
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-theme-accent cursor-pointer border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme px-1"
                >
                  Reset to All Leads
                </button>
              }
            />
          </div>
        )}
      </div>

      <BulkActionsPanel
        selectedLeadIds={selectedLeadIds}
        setSelectedLeadIds={setSelectedLeadIds}
        bulkAssignee={bulkAssignee}
        setBulkAssignee={setBulkAssignee}
        bulkStatus={bulkStatus}
        setBulkStatus={setBulkStatus}
        users={users}
        isManagerial={isManagerial}
        bulkUpdateLeads={bulkUpdateLeads}
        archiveLeads={archiveLeads}
        user={user}
        toast={toast}
      />

      <LeadListMobileFilterSheet
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        draftFilters={draftFilters}
        onChange={updateDraft}
        onSearch={applySearch}
        onReset={resetFilters}
        users={users}
        projects={projects}
        isManagerial={isManager}
        shouldHideEmail={shouldHideEmail}
        shouldHideLeadSource={shouldHideLeadSource}
        activeCount={activeCount}
      />
    </div>
  );
}
