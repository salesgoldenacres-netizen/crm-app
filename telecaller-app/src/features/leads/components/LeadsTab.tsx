import React, { useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  FileText,
  PlusCircle,
  Layout,
  Trash2,
} from "lucide-react";
import { useToast } from "@/shared/components/Toast";
import LeadsWorkspace from "./LeadsWorkspace";
import LeadBinWorkspace from "./LeadBinWorkspace";
import LeadSubmissionForm from "./LeadSubmissionForm";
import LeadsKanbanBoard from "./LeadsKanbanBoard";
import { isManagerial } from "@/shared/utils/roleUtils";
import { useAuthorization } from "@/shared/services/AuthorizationContext";
import { safeFormatDateTime } from "@/shared/utils/dateUtils";
import { useLeadsStore } from "../hooks/useLeadsStore";
import { useLeadQuery } from "../hooks/useLeadQuery";
import { useAppShell } from "@/shared/layouts/AppShellContext";
import { useCustomRolesStore } from "@/features/admin/hooks/adminStores";
import { useProjectScope } from "@/shared/services/ProjectScopeContext";
import { createDefaultLeadQuerySpec } from "@/shared/services/leads";
import { DEFAULT_PAGE_SIZE } from "@/shared/services/performance/pagination/contracts/paginationConstants";
import { mapLeadListFiltersToQuery } from "../utils/mapLeadListFiltersToQuery";

// Direct domain store imports
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useUsersStore } from "@/features/employees/hooks/useUsersStore";
import { Lead, User } from "@/shared/types";
import { useLeadListFilters } from "../hooks/useLeadListFilters";
import { planStatusTransition } from "@/shared/contracts";

interface LeadsTabProps {
  user: User;
  leadsSubTab: string;
  setLeadsSubTab: (tab: string) => void;
  onStartCall: (lead: Lead) => void;
  onStartWhatsApp: (lead: Lead) => void;
  dashboardSlot?: React.ReactNode;
}

function isLeadIdle(lead: Lead) {
  if (!lead.updatedAt) return false;
  const lastUpdate = new Date(lead.updatedAt);
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  return (
    lastUpdate < threeDaysAgo &&
    lead.status !== "booked" &&
    lead.status !== "not-interested"
  );
}

export default function LeadsTab({
  user,
  leadsSubTab,
  setLeadsSubTab,
  onStartCall,
  onStartWhatsApp,
  dashboardSlot,
}: LeadsTabProps) {
  const navigate = useNavigate();
  const { openCallLogModal } = useAppShell();
  const { toast } = useToast();
  const todayStr = new Date().toISOString().split("T")[0];
  const { activeProjectId } = useProjectScope();

  const {
    addLead,
    updateLead,
    logCall,
    bulkUpdateLeads,
    archiveLeads,
  } = useLeadsStore();
  const { users } = useUsersStore();
  const { projects } = useProjectsStore();
  const { roles: customRoles } = useCustomRolesStore();
  const { canAssignLead } = useAuthorization();
  const checkIsManagerial = (roleCode?: string) => {
    if (!roleCode || roleCode === user.role) {
      return canAssignLead();
    }
    return isManagerial(roleCode || "", customRoles);
  };
  const managerial = checkIsManagerial(user.role);

  // Local UI states for Leads tab
  const [leadsViewMode, setLeadsViewMode] = useState<"compact" | "normal">("normal");
  const {
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
  } = useLeadListFilters(user.id, todayStr);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isPowerDialerActive, setIsPowerDialerActive] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const leadsGrouping = "none" as const;
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const querySpec = useMemo(() => {
    const { server, client } = mapLeadListFiltersToQuery(appliedFilters, {
      activeProjectId,
      todayStr,
      pushAssignedToServer: managerial,
    });
    return createDefaultLeadQuerySpec(user.id, user.role || "telecaller", {
      pageSize: DEFAULT_PAGE_SIZE,
      server,
      client,
      prefetchNext: true,
    });
  }, [appliedFilters, activeProjectId, todayStr, managerial, user.id, user.role]);

  const {
    items: pageLeads,
    isLoading: leadsLoading,
    isRefreshing,
    error: leadsError,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    refresh,
  } = useLeadQuery(user, customRoles, querySpec);

  // One page → group/virtualize (no per-group cursors). Same page feeds list + kanban.
  const myLeads = pageLeads;
  const kanbanLeads = pageLeads;

  const handleKanbanDrop = async (leadId: string, targetStatus: string) => {
    const leadToUpdate = pageLeads.find((l) => l.id === leadId);
    if (!leadToUpdate) return;

    const plan = planStatusTransition({
      from: leadToUpdate.status,
      to: targetStatus,
      reason: "kanban",
    });
    if (!plan.ok) {
      if (plan.error !== "Status unchanged") {
        toast(plan.error || "Status transition not allowed.", "error");
      }
      return;
    }

    await updateLead(leadId, plan.leadPatch);
    refresh();
  };

  const touchStartRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent<any>) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent<any>, lead: Lead) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartRef.current.x;
    const diffY = touchEndY - touchStartRef.current.y;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 85) {
      if (diffX > 0) {
        if (onStartCall) onStartCall(lead);
        toast(`Calling ${lead.name}...`, "info");
      } else {
        navigate(`/lead/${lead.id}`);
        toast(`Opening details for ${lead.name}...`, "info");
      }
    }
  };

  const shouldHideEmail = !!user.roleRestrictions?.hideEmail;
  const shouldHideLeadSource = !!user.roleRestrictions?.hideLeadSource;

  return (
    <div className="space-y-3">
      {/* Sub-tabs header */}
      <div className="border-b border-theme-border pb-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 md:border-b-0 md:pb-0 md:justify-end">
        <div className="block sm:hidden w-full">
          <select
            value={leadsSubTab}
            onChange={(e) => {
              const val = e.target.value;
              setLeadsSubTab(val);
            }}
            className="w-full bg-theme-card border border-theme-border rounded-theme px-3 py-2 text-xs font-bold text-theme-text focus:outline-none focus:ring-1 focus:ring-theme-ring cursor-pointer"
          >
            <option value="dashboard">Dashboard Overview</option>
            <option value="list">Leads List</option>
            <option value="form">Lead Submission</option>
            <option value="kanban">Kanban Board</option>
            {(user?.role === "admin" || user?.role === "manager") && (
              <option value="bin">Lead Bin</option>
            )}
          </select>
        </div>

        <div className="hidden sm:flex md:hidden space-x-1.5 overflow-x-auto scrollbar-none">
          {[
            {
              id: "dashboard",
              label: "Dashboard",
              icon: <BarChart3 className="w-3.5 h-3.5" />,
            },
            {
              id: "list",
              label: "Leads List",
              icon: <FileText className="w-3.5 h-3.5" />,
            },
            {
              id: "form",
              label: "Submission",
              icon: <PlusCircle className="w-3.5 h-3.5" />,
            },
            {
              id: "kanban",
              label: "Kanban",
              icon: <Layout className="w-3.5 h-3.5" />,
            },
            ...(user?.role === "admin" || user?.role === "manager"
              ? [
                  {
                    id: "bin",
                    label: "Lead Bin",
                    icon: <Trash2 className="w-3.5 h-3.5" />,
                  },
                ]
              : []),
          ].map((subTab) => (
            <button
              key={subTab.id}
              type="button"
              onClick={() => setLeadsSubTab(subTab.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                leadsSubTab === subTab.id
                  ? "bg-theme-accent-muted border-theme-accent/30 text-theme-accent"
                  : "border-transparent text-theme-muted hover:text-theme-text hover:bg-theme-surface"
              }`}
            >
              {subTab.icon}
              <span>{subTab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {leadsSubTab === "dashboard" && dashboardSlot}

      {leadsSubTab === "list" && (
        <LeadsWorkspace
          user={user}
          users={users}
          myLeads={myLeads}
          projects={projects}
          isManagerial={checkIsManagerial}
          draftFilters={draftFilters}
          appliedFilters={appliedFilters}
          activePresetId={activePresetId}
          updateDraft={updateDraft}
          applySearch={applySearch}
          resetFilters={resetFilters}
          applyPreset={applyPreset}
          clearChip={clearChip}
          clearAllChips={clearAllChips}
          getChips={getChips}
          leadsGrouping={leadsGrouping}
          collapsedGroups={collapsedGroups}
          setCollapsedGroups={setCollapsedGroups}
          leadsViewMode={leadsViewMode}
          setLeadsViewMode={setLeadsViewMode}
          selectedLeadIds={selectedLeadIds}
          setSelectedLeadIds={setSelectedLeadIds}
          isPowerDialerActive={isPowerDialerActive}
          setIsPowerDialerActive={setIsPowerDialerActive}
          bulkAssignee={bulkAssignee}
          setBulkAssignee={setBulkAssignee}
          bulkStatus={bulkStatus}
          setBulkStatus={setBulkStatus}
          handleTouchStart={handleTouchStart}
          handleTouchEnd={handleTouchEnd}
          setCallLogForm={() => {}}
          onAddLeadClick={() => setLeadsSubTab("form")}
          setActiveLead={(lead: Lead) => openCallLogModal(lead)}
          bulkUpdateLeads={bulkUpdateLeads}
          isLeadIdle={isLeadIdle}
          safeFormatDateTime={safeFormatDateTime}
          shouldHideEmail={shouldHideEmail}
          shouldHideLeadSource={shouldHideLeadSource}
          todayStr={todayStr}
          logCall={logCall}
          archiveLeads={archiveLeads}
          isLoading={leadsLoading}
          isRefreshing={isRefreshing}
          loadError={leadsError}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onNextPage={nextPage}
          onPreviousPage={previousPage}
          onRefreshPage={refresh}
        />
      )}

      {leadsSubTab === "form" && (
        <LeadSubmissionForm
          user={user}
          projects={projects}
          isManagerial={checkIsManagerial}
          addLead={addLead}
          toast={toast}
          setLeadsSubTab={setLeadsSubTab}
        />
      )}

      {leadsSubTab === "kanban" && (
        <div className="space-y-2">
          {(leadsLoading || isRefreshing) && (
            <p className="text-[11px] text-theme-muted px-1">
              {leadsLoading ? "Loading pipeline…" : "Refreshing…"}
            </p>
          )}
          {leadsError && (
            <p className="text-[11px] text-theme-danger px-1">{leadsError}</p>
          )}
          <LeadsKanbanBoard
            kanbanLeads={kanbanLeads}
            projects={projects}
            handleKanbanDrop={handleKanbanDrop}
            handleTouchStart={handleTouchStart}
            handleTouchEnd={handleTouchEnd}
            onStartCall={onStartCall}
            onStartWhatsApp={onStartWhatsApp}
            todayStr={todayStr}
            navigate={navigate}
          />
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              disabled={!hasPreviousPage || leadsLoading}
              onClick={previousPage}
              className="min-h-11 px-3 py-1.5 rounded-theme border border-theme-border bg-theme-surface text-[11px] font-semibold text-theme-text disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!hasNextPage || leadsLoading}
              onClick={nextPage}
              className="min-h-11 px-3 py-1.5 rounded-theme border border-theme-border bg-theme-surface text-[11px] font-semibold text-theme-text disabled:opacity-40 cursor-pointer"
            >
              Next page
            </button>
          </div>
        </div>
      )}

      {leadsSubTab === "bin" && (user?.role === "admin" || user?.role === "manager") && (
        <LeadBinWorkspace
          users={users}
          projects={projects}
          isManagerial={checkIsManagerial}
        />
      )}
    </div>
  );
}
