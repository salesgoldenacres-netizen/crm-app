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
import Button from "@/shared/components/ui/Button";
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
import { NAV_LABELS } from "@/shared/constants/navTaxonomy";

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
  setCallLogForm: (form: Record<string, unknown>) => void;
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
  /** LeadQueryService page state */
  isLoading?: boolean;
  isRefreshing?: boolean;
  loadError?: string | null;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  onRefreshPage?: () => void;
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
  isLoading = false,
  isRefreshing = false,
  loadError = null,
  hasNextPage = false,
  hasPreviousPage = false,
  onNextPage,
  onPreviousPage,
  onRefreshPage,
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

      {/* Command bar — quiet surface, cohesive filters/chips */}
      <div className="shrink-0 rounded-theme border border-theme-border bg-theme-card px-3 py-2.5 space-y-2.5 shadow-elevation-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3">
          <div className="flex items-center justify-between gap-3 min-w-0 lg:shrink-0">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h2 className="type-card-title text-sm text-theme-text tracking-tight">
                  {NAV_LABELS.leads}
                </h2>
                <span className="type-secondary text-[11px] font-medium text-theme-muted tabular-nums">
                  {isLoading
                    ? "Loading…"
                    : `${myLeads.length.toLocaleString()} on page`}
                  {isRefreshing ? " · refreshing" : ""}
                  {activeCount > 0
                    ? ` · ${activeCount} filter${activeCount === 1 ? "" : "s"}`
                    : ""}
                </span>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={onAddLeadClick}
              className="lg:hidden gap-1 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" aria-hidden />
              Add
            </Button>
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
              className="hidden md:inline-flex items-center gap-1 min-h-11 px-2.5 py-2 rounded-theme border border-theme-border bg-theme-surface text-[11px] font-semibold text-theme-muted hover:text-theme-text cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring md:min-h-0 md:py-1.5"
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
              className={`inline-flex items-center gap-1 min-h-11 min-w-11 px-2.5 py-2 rounded-theme border text-[11px] font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring sm:min-h-0 sm:min-w-0 sm:py-1.5 ${
                isPowerDialerActive
                  ? "border-theme-success/40 bg-theme-success/15 text-theme-success"
                  : "border-theme-border bg-theme-surface text-theme-muted hover:text-theme-text"
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
              className="md:hidden inline-flex items-center gap-1 min-h-11 px-3 py-2 rounded-theme border border-theme-border bg-theme-surface text-[11px] font-semibold text-theme-text cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
            >
              <Filter className="w-3.5 h-3.5 text-theme-accent" aria-hidden />
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>

            <Button
              type="button"
              size="sm"
              onClick={onAddLeadClick}
              className="hidden lg:inline-flex gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" aria-hidden />
              Add Lead
            </Button>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="pt-0.5 border-t border-theme-border/70">
            <LeadListFilterChips
              chips={chips}
              onClearChip={clearChip}
              onClearAll={clearAllChips}
              resultCount={myLeads.length}
              className="pt-2"
            />
          </div>
        )}
      </div>

      {/* Table is the primary surface */}
      <div className="min-h-0 rounded-theme border border-theme-border bg-theme-card overflow-hidden shadow-elevation-sm">
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

        {loadError && (
          <div className="border-t border-theme-border px-4 py-3 text-[11px] text-theme-danger">
            {loadError}
            {onRefreshPage && (
              <button
                type="button"
                onClick={onRefreshPage}
                className="ml-2 underline cursor-pointer bg-transparent border-0 text-theme-danger"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {!isLoading && myLeads.length === 0 && !loadError && (
          <div className="border-t border-theme-border p-6">
            <EmptyState
              variant="compact"
              preset="leads"
              title="Your queue is clear"
              description="No leads match this view. Try another work queue, adjust filters, or reset to see everything assigned to you."
              className="border-0 bg-transparent shadow-none"
              action={
                <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                  Reset to All Leads
                </Button>
              }
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-theme-border px-3 py-2 bg-theme-surface/40">
          <button
            type="button"
            disabled={!hasPreviousPage || isLoading}
            onClick={onPreviousPage}
            className="min-h-11 px-3 py-1.5 rounded-theme border border-theme-border bg-theme-card text-[11px] font-semibold text-theme-text disabled:opacity-40 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-[10px] text-theme-muted tabular-nums">
            Cursor page · {myLeads.length} rows
          </span>
          <button
            type="button"
            disabled={!hasNextPage || isLoading}
            onClick={onNextPage}
            className="min-h-11 px-3 py-1.5 rounded-theme border border-theme-border bg-theme-card text-[11px] font-semibold text-theme-text disabled:opacity-40 cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>

      <BulkActionsPanel
        selectedLeadIds={selectedLeadIds}
        setSelectedLeadIds={setSelectedLeadIds}
        pageLeads={myLeads}
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
