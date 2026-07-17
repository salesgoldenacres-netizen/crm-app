import React, { useState, useRef } from "react";
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
import { useAppShell } from "@/shared/layouts/AppShellContext";
import { useCustomRolesStore } from "@/features/admin/hooks/adminStores";

// Direct domain store imports
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useUsersStore } from "@/features/employees/hooks/useUsersStore";
import { Lead, User } from "@/shared/types";
import { useLeadsFiltering } from "../hooks/useLeadsFiltering";
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

  // Fetch from custom hooks
  const {
    leads,
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

  const handleKanbanDrop = async (leadId: string, targetStatus: string) => {
    const leadToUpdate = leads.find((l) => l.id === leadId);
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

    // Check if horizontal swipe is prominent and meets minimum threshold of 85px
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 85) {
      if (diffX > 0) {
        // Swiped Right -> Call Lead
        if (onStartCall) onStartCall(lead);
        toast(`Calling ${lead.name}...`, "info");
      } else {
        // Swiped Left -> Navigate to details page
        navigate(`/lead/${lead.id}`);
        toast(`Opening details for ${lead.name}...`, "info");
      }
    }
  };

  const { myLeads, isLeadIdle } = useLeadsFiltering(
    leads,
    user,
    appliedFilters,
    projects,
    todayStr
  );

  const shouldHideEmail = !!user.roleRestrictions?.hideEmail;
  const shouldHideLeadSource = !!user.roleRestrictions?.hideLeadSource;

  const kanbanLeads = myLeads; // Same filtered set for kanban

  return (
    <div className="space-y-3">
      {/* Sub-tabs header */}
      <div className="border-b border-theme-border pb-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 md:border-b-0 md:pb-0 md:justify-end">
        {/* Mobile Select Picker for Leads Sub-Tabs */}
        <div className="block sm:hidden w-full">
          <select
            value={leadsSubTab}
            onChange={(e) => {
              const val = e.target.value;
              setLeadsSubTab(val);
            }}
            className="w-full bg-theme-card border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-text focus:outline-none focus:ring-1 focus:ring-theme-ring cursor-pointer"
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

      {/* Leads List Sub-tab */}
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
