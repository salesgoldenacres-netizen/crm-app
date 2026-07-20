import React, {
  Fragment,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { User, Lead, Project } from "@/shared/types";
import LeadsTableRow from "./LeadsTableRow";
import LeadListDesktopFilterRow from "./LeadListDesktopFilterRow";
import { LeadListFilters } from "@/features/leads/config/leadListFilterConfig";
import { useTanStackVirtualEngine } from "@/shared/services/performance/virtualization/TanStackVirtualEngine";

interface LeadsDesktopTableProps {
  myLeads: Lead[];
  selectedLeadIds: string[];
  setSelectedLeadIds: React.Dispatch<React.SetStateAction<string[]>> | ((ids: string[]) => void);
  leadsViewMode: "compact" | "normal";
  leadsGrouping: "none" | "status" | "priority";
  collapsedGroups: Record<string, boolean>;
  setCollapsedGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>> | ((groups: Record<string, boolean>) => void);
  projects: Record<string, Project>;
  todayStr: string;
  isLeadIdle: (lead: Lead) => boolean;
  shouldHideEmail: boolean;
  shouldHideLeadSource: boolean;
  logCall: (leadId: string, logData: any) => Promise<void>;
  setActiveLead: (lead: Lead) => void;
  setCallLogForm: (form: any) => void;
  user: User;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
  safeFormatDateTime: (dateStr?: string, showTime?: boolean) => string;
  archiveLeads: (ids: string[], username: string) => Promise<void>;
  users: User[];
  isManagerialRole: boolean;
  draftFilters: LeadListFilters;
  onDraftChange: (patch: Partial<LeadListFilters>) => void;
  onSearch: () => void;
  onReset: () => void;
}

const HEADER_TH =
  "text-left type-label text-xs font-semibold text-theme-muted uppercase tracking-wider bg-theme-surface";

const VIRTUALIZE_THRESHOLD = 40;

function LeadsDesktopTable({
  myLeads,
  selectedLeadIds,
  setSelectedLeadIds,
  leadsViewMode,
  leadsGrouping,
  collapsedGroups,
  setCollapsedGroups,
  projects,
  todayStr,
  isLeadIdle,
  shouldHideEmail,
  shouldHideLeadSource,
  logCall,
  setActiveLead,
  setCallLogForm,
  user,
  toast,
  safeFormatDateTime,
  archiveLeads,
  users,
  isManagerialRole,
  draftFilters,
  onDraftChange,
  onSearch,
  onReset,
}: LeadsDesktopTableProps) {
  const scrollParentRef = useRef<HTMLDivElement>(null);

  const handleToggleSelect = useCallback(
    (leadId: string, checked: boolean) => {
      if (typeof setSelectedLeadIds === "function") {
        (setSelectedLeadIds as any)((prev: string[]) => {
          if (checked) {
            return prev.includes(leadId) ? prev : [...prev, leadId];
          } else {
            return prev.filter((id: string) => id !== leadId);
          }
        });
      }
    },
    [setSelectedLeadIds]
  );

  const estimateSize = useCallback(
    () => (leadsViewMode === "compact" ? 44 : 56),
    [leadsViewMode]
  );

  const shouldVirtualize =
    leadsGrouping === "none" && myLeads.length >= VIRTUALIZE_THRESHOLD;

  const virtualEngine = useTanStackVirtualEngine({
    count: shouldVirtualize ? myLeads.length : 0,
    estimateSize,
    overscan: 12,
    getScrollElement: () => scrollParentRef.current,
  });

  const virtualItems = shouldVirtualize ? virtualEngine.getVirtualItems() : [];
  const totalSize = shouldVirtualize ? virtualEngine.getTotalSize() : 0;

  const colSpan = leadsViewMode === "compact" ? 9 : 14;

  const renderRow = (lead: Lead) => {
    return (
      <LeadsTableRow
        key={lead.id}
        lead={lead}
        isSelected={selectedLeadIds.includes(lead.id)}
        onToggleSelect={handleToggleSelect}
        leadsViewMode={leadsViewMode}
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
      />
    );
  };

  const groups = useMemo(
    () =>
      leadsGrouping === "status"
        ? [
            {
              id: "raw",
              name: "Raw Leads",
              filter: (l: Lead) => l.status === "raw" || !l.status,
              color: "bg-theme-muted",
              headerBg: "bg-theme-surface/60",
            },
            {
              id: "new",
              name: "New Leads",
              filter: (l: Lead) => l.status === "new",
              color: "bg-sky-500",
              headerBg: "bg-sky-50/50 dark:bg-sky-950/20",
            },
            {
              id: "contacted",
              name: "Contacted Leads",
              filter: (l: Lead) => l.status === "contacted",
              color: "bg-theme-warning",
              headerBg: "bg-theme-warning/10",
            },
            {
              id: "interested",
              name: "Interested Leads",
              filter: (l: Lead) => l.status === "interested",
              color: "bg-theme-success",
              headerBg: "bg-theme-success/10",
            },
            {
              id: "sitevisit_confirmed",
              name: "Site Visit Confirmed",
              filter: (l: Lead) => l.status === "sitevisit-confirmed",
              color: "bg-theme-accent",
              headerBg: "bg-theme-accent-muted/40",
            },
            {
              id: "sitevisit_completed",
              name: "Site Visit Completed",
              filter: (l: Lead) => l.status === "sitevisit-completed",
              color: "bg-theme-success",
              headerBg: "bg-theme-success/10",
            },
            {
              id: "booked",
              name: "Booked & Reserved",
              filter: (l: Lead) => l.status === "booked" || l.status === "reserved",
              color: "bg-theme-accent",
              headerBg: "bg-theme-accent-muted/40",
            },
            {
              id: "not_interested",
              name: "Not Interested",
              filter: (l: Lead) => l.status === "not-interested",
              color: "bg-theme-danger",
              headerBg: "bg-theme-danger/10",
            },
          ]
        : [
            {
              id: "hot",
              name: "Hot Priority",
              filter: (l: Lead) => l.priority === "hot",
              color: "bg-theme-danger",
              headerBg: "bg-theme-danger/10",
            },
            {
              id: "warm",
              name: "Warm Priority",
              filter: (l: Lead) => l.priority === "warm" || !l.priority,
              color: "bg-theme-warning",
              headerBg: "bg-theme-warning/10",
            },
            {
              id: "cold",
              name: "Cold Priority",
              filter: (l: Lead) => l.priority === "cold",
              color: "bg-sky-500",
              headerBg: "bg-sky-50/50 dark:bg-sky-950/20",
            },
          ],
    [leadsGrouping]
  );

  const pad = leadsViewMode === "compact" ? "px-3 py-2.5" : "px-6 py-4";

  const paddingTop =
    virtualItems.length > 0 ? virtualItems[0]!.start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1]!.start - virtualItems[virtualItems.length - 1]!.size
      : 0;

  return (
    <div
      ref={scrollParentRef}
      className="hidden md:block w-full max-h-[min(78dvh,820px)] overflow-auto rounded-theme border-0 bg-theme-card transition-colors scrollbar-thin"
    >
      <table className="w-full min-w-max divide-y divide-theme-border">
        <thead className="bg-theme-surface transition-colors sticky top-0 z-20 shadow-sm">
          <tr className="border-b border-theme-border">
            <th className="px-4 py-3 text-left w-10 bg-theme-surface">
              <input
                type="checkbox"
                className="rounded border-theme-border text-theme-accent focus:ring-theme-ring cursor-pointer"
                checked={myLeads.length > 0 && selectedLeadIds.length === myLeads.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    if (typeof setSelectedLeadIds === "function") {
                      (setSelectedLeadIds as any)(myLeads.map((l) => l.id));
                    }
                  } else {
                    if (typeof setSelectedLeadIds === "function") {
                      (setSelectedLeadIds as any)([]);
                    }
                  }
                }}
              />
            </th>
            <th className={`${pad} ${HEADER_TH}`}>Lead Number</th>
            {leadsViewMode !== "compact" && (
              <th className={`px-6 py-4 ${HEADER_TH}`}>Created Time</th>
            )}
            <th className={`${pad} ${HEADER_TH}`}>
              {leadsViewMode === "compact" ? "Lead Info" : "Name"}
            </th>
            {leadsViewMode !== "compact" && (
              <>
                <th className={`px-6 py-4 ${HEADER_TH}`}>Mobile Phone</th>
                <th className={`px-6 py-4 ${HEADER_TH}`}>Email</th>
                <th className={`px-6 py-4 ${HEADER_TH}`}>Lead Source</th>
                <th className={`px-6 py-4 ${HEADER_TH}`}>Lead Medium</th>
              </>
            )}
            {leadsViewMode === "compact" && (
              <th className={`px-3 py-2.5 ${HEADER_TH}`}>Source</th>
            )}
            <th className={`${pad} ${HEADER_TH}`}>Lead Status</th>
            <th className={`${pad} ${HEADER_TH}`}>Touchpoints</th>
            <th className={`${pad} ${HEADER_TH}`}>Follow Up On</th>
            <th className={`${pad} ${HEADER_TH}`}>Assigned To</th>
            {leadsViewMode !== "compact" && (
              <th className={`px-6 py-4 ${HEADER_TH}`}>Created By</th>
            )}
            <th
              className={`${pad} text-right type-label text-xs font-semibold text-theme-muted uppercase tracking-wider bg-theme-surface`}
            >
              Actions
            </th>
          </tr>
          <LeadListDesktopFilterRow
            draftFilters={draftFilters}
            onChange={onDraftChange}
            onSearch={onSearch}
            onReset={onReset}
            users={users}
            projects={projects}
            leadsViewMode={leadsViewMode}
            isManagerial={isManagerialRole}
            shouldHideEmail={shouldHideEmail}
            shouldHideLeadSource={shouldHideLeadSource}
          />
        </thead>
        <tbody className="bg-theme-card divide-y divide-theme-border transition-colors">
          {leadsGrouping === "none" ? (
            shouldVirtualize ? (
              <>
                {paddingTop > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={colSpan} style={{ height: paddingTop, padding: 0, border: 0 }} />
                  </tr>
                )}
                {virtualItems.map((item) => {
                  const lead = myLeads[item.index];
                  if (!lead) return null;
                  return renderRow(lead);
                })}
                {paddingBottom > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={colSpan} style={{ height: paddingBottom, padding: 0, border: 0 }} />
                  </tr>
                )}
              </>
            ) : (
              myLeads.map(renderRow)
            )
          ) : (
            groups.map((g) => {
              const groupLeads = myLeads.filter(g.filter);
              if (groupLeads.length === 0) return null;
              const isCollapsed = !!collapsedGroups[g.id];

              return (
                <Fragment key={g.id}>
                  <tr className={`${g.headerBg} border-y border-theme-border/60`}>
                    <td colSpan={colSpan} className="px-4 py-2 text-left">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof setCollapsedGroups === "function") {
                              (setCollapsedGroups as any)((prev: Record<string, boolean>) => ({
                                ...prev,
                                [g.id]: !prev[g.id],
                              }));
                            }
                          }}
                          className="flex items-center space-x-2 font-semibold text-xs text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring cursor-pointer border-0 bg-transparent rounded-theme"
                        >
                          <span className={`w-2 h-2 rounded-full ${g.color}`} />
                          <span>
                            {g.name} ({groupLeads.length})
                          </span>
                          <span className="text-[10px] text-theme-muted font-semibold">
                            {isCollapsed ? "▶ Expand" : "▼ Collapse"}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {!isCollapsed && groupLeads.map(renderRow)}

                  {!isCollapsed && (
                    <tr className="bg-theme-surface/40 text-[10px] text-theme-muted font-semibold border-b border-theme-border/50">
                      <td colSpan={colSpan} className="px-6 py-2 text-right">
                        Group total count:{" "}
                        <span className="font-semibold text-theme-text">{groupLeads.length}</span> leads
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default React.memo(LeadsDesktopTable);
