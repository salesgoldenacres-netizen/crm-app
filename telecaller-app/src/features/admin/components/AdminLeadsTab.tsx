// No react hooks needed directly – all state via custom hooks
import { Link } from "react-router-dom";
import {
  MessageCircle,
  Download,
  FileSpreadsheet,
  Plus,
  Filter,
  FileText,
  Edit3,
  Trash2,
} from "lucide-react";

import SegmentedStageTracker from "@/shared/components/SegmentedStageTracker";
import DataTable, { ColumnDef } from "@/shared/components/DataTable";
import FilterSearchInput from "@/shared/components/FilterSearchInput";
import Badge from "@/shared/components/ui/Badge";
import { Lead } from "@/shared/types";
import { useLeadsStore } from "@/features/leads/hooks/useLeadsStore";
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useUsersStore } from "@/features/employees/hooks/useUsersStore";
import { useAuditLogsStore } from "@/features/admin/hooks/adminStores";
import { safeFormatDateTime } from "@/shared/utils/dateUtils";

import { useAdminLeads } from "@/features/leads/hooks/useAdminLeads";
import LeadAcquisitionAnalytics from "@/features/leads/components/LeadAcquisitionAnalytics";
import PendingDiscountsApprovals from "@/features/leads/components/PendingDiscountsApprovals";
import LeadsFilterPanel from "@/features/leads/components/LeadsFilterPanel";
import LeadListFilterChips, {
  type FilterChipDisplay,
} from "@/features/leads/components/LeadListFilterChips";

import AdminLeadModal from "@/features/leads/components/AdminLeadModal";
import BulkLeadImportModal from "@/features/leads/components/BulkLeadImportModal";
import CampaignBroadcastModal from "@/features/leads/components/CampaignBroadcastModal";
import Dialog from "@/shared/components/ui/Dialog";

import { User } from "@/shared/types";
import { planStatusTransition } from "@/shared/contracts";

interface AdminLeadsTabProps {
  user: User;
  isManagerial: (role: string) => boolean;
}

export default function AdminLeadsTab({ user, isManagerial }: AdminLeadsTabProps) {
  const {
    leads,
    addLead,
    updateLead: updateLeadInStore,
    deleteLead,
    bulkAddLeads,
  } = useLeadsStore();
  const { projects } = useProjectsStore();
  const { users } = useUsersStore();
  const { logAuditEvent } = useAuditLogsStore();

  const {
    isAdvancedFilterOpen,
    setIsAdvancedFilterOpen,
    leadsViewMode,
    setLeadsViewMode,
    leadSearchQuery,
    setLeadSearchQuery,
    advancedFilters,
    setAdvancedFilters,
    checkedLeadIds,
    setCheckedLeadIds,
    isLeadModalOpen,
    setIsLeadModalOpen,
    editingLead,
    isBulkImportOpen,
    setIsBulkImportOpen,
    isCampaignModalOpen,
    setIsCampaignModalOpen,
    selectedCampaignLeadIds,
    setSelectedCampaignLeadIds,
    checkSlaBreach,
    checkStatusEscalation,
    filteredLeads,
    handleOpenLeadModal,
    handleSaveLead,
    handleDeleteLead,
    confirmDeleteLead,
    pendingDeleteLeadId,
    setPendingDeleteLeadId,
    feedbackAlert,
    setFeedbackAlert,
    handleAssigneeChange,
    handleExportCSV,
    escalationDays,
  } = useAdminLeads({
    user,
    leads,
    projects,
    users,
    addLead,
    updateLead: updateLeadInStore,
    deleteLead,
    logAuditEvent,
  });

  const columns: ColumnDef<Lead>[] = [
    {
      key: "leadNumber",
      header: "Lead Number",
      sortable: true,
      className: leadsViewMode === "compact" ? "text-xs text-theme-muted" : "text-sm text-theme-muted",
      render: (l) => l.leadNumber || "—",
    },
    ...(leadsViewMode !== "compact"
      ? [
          {
            key: "createdTime",
            header: "Created Time",
            sortable: true,
            className: "text-xs text-theme-muted",
            render: (l: Lead) => safeFormatDateTime(l.createdTime || l.createdAt),
          },
        ]
      : []),
    {
      key: "name",
      header: leadsViewMode === "compact" ? "Lead Info" : "Name",
      sortable: true,
      render: (l) => {
        if (leadsViewMode === "compact") {
          return (
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-theme-text flex items-center flex-wrap gap-1">
                <span>{l.name}</span>
                {checkSlaBreach(l) && <Badge variant="danger">SLA Breach</Badge>}
                {checkStatusEscalation(l, escalationDays) && <Badge variant="warning">Stuck</Badge>}
                {l.priority === "hot" && <Badge variant="warning">Hot</Badge>}
                {l.priority === "cold" && <Badge variant="info">Cold</Badge>}
              </div>
              <div className="text-[10px] text-theme-muted flex flex-col space-y-0.5">
                <span className="font-medium text-theme-text">
                  {l.phone} {l.email && `• ${l.email}`}
                </span>
                <span className="text-[9px] text-theme-muted">
                  {l.projectId && projects[l.projectId]
                    ? `${projects[l.projectId].name} ${l.plotId ? `#${l.plotId}` : ""}`
                    : "No Project"}
                  {` • Created ${safeFormatDateTime(l.createdTime || l.createdAt, false)}`}
                </span>
              </div>
            </div>
          );
        } else {
          return (
            <div className="text-sm font-semibold text-theme-text flex items-center flex-wrap gap-1.5">
              <span>{l.name}</span>
              {checkSlaBreach(l) && <Badge variant="danger">SLA Breach</Badge>}
              {checkStatusEscalation(l, escalationDays) && <Badge variant="warning">Stuck</Badge>}
              {l.priority === "hot" && <Badge variant="warning">Hot</Badge>}
              {l.priority === "cold" && <Badge variant="info">Cold</Badge>}
            </div>
          );
        }
      },
    },
    ...(leadsViewMode !== "compact"
      ? [
          {
            key: "phone",
            header: "Mobile Phone",
            sortable: true,
            className: "text-sm text-theme-text",
            render: (l: Lead) => l.phone,
          },
          {
            key: "email",
            header: "Email",
            sortable: true,
            className: "text-xs text-theme-muted truncate max-w-[150px]",
            render: (l: Lead) => l.email || "—",
          },
          {
            key: "leadSource",
            header: "Lead Source",
            sortable: true,
            className: "text-sm text-theme-muted",
            render: (l: Lead) => l.leadSource || "—",
          },
          {
            key: "leadMedium",
            header: "Lead Medium",
            sortable: true,
            className: "text-sm text-theme-muted",
            render: (l: Lead) => l.leadMedium || "—",
          },
        ]
      : [
          {
            key: "source",
            header: "Source",
            sortable: true,
            className: "text-xs text-theme-muted",
            render: (l: Lead) => (
              <span className="px-1.5 py-0.5 rounded-theme bg-theme-surface text-theme-muted type-label font-semibold uppercase tracking-wider text-[8px] border border-theme-border">
                {l.leadSource || "Direct"} / {l.leadMedium || "Direct"}
              </span>
            ),
          },
        ]),
    {
      key: "status",
      header: "Lead Status",
      sortable: true,
      render: (l) => (
        <SegmentedStageTracker
          status={l.status}
          onChange={async (newStatus) => {
            const plan = planStatusTransition({
              from: l.status,
              to: newStatus,
              reason: "admin",
            });
            if (!plan.ok) {
              if (plan.error !== "Status unchanged") {
                setFeedbackAlert(
                  plan.error || "Status transition not allowed.",
                );
              }
              return;
            }
            await updateLeadInStore(l.id, plan.leadPatch);
          }}
        />
      ),
    },
    {
      key: "followUpDate",
      header: "Follow Up On",
      sortable: true,
      render: (l) => {
        const dateVal = l.followUpOn || l.followUpDate || "—";
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-theme border bg-theme-surface text-theme-text border-theme-border">
            {dateVal}
          </span>
        );
      },
    },
    {
      key: "assignedToName",
      header: "Assigned To",
      sortable: true,
      render: (l) => (
        <select
          value={l.assignedTo || ""}
          onChange={(e) => handleAssigneeChange(l.id, e.target.value)}
          className="text-xs bg-theme-surface text-theme-text border border-theme-border rounded-theme p-1 cursor-pointer font-semibold"
        >
          <option value="">Unassigned</option>
          {users
            .filter((u) => !isManagerial(u.role))
            .map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.username} ({tc.role})
              </option>
            ))}
        </select>
      ),
    },
    ...(leadsViewMode !== "compact"
      ? [
          {
            key: "createdBy",
            header: "Created By",
            sortable: true,
            className: "text-sm text-theme-muted",
            render: (l: Lead) => l.createdBy || "—",
          },
        ]
      : []),
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      render: (l) => (
        <div className="flex justify-end items-center space-x-2 text-xs sm:text-sm font-semibold">
          <Link
            to={`/lead/${l.id}`}
            className="text-theme-success hover:opacity-80 flex items-center font-semibold cursor-pointer"
            title="View Workspace"
          >
            <FileText className="w-4 h-4 mr-1 inline" /> View
          </Link>
          <button
            onClick={() => handleOpenLeadModal(l)}
            className="text-theme-accent hover:opacity-80 flex items-center font-semibold cursor-pointer bg-transparent border-0"
            title="Edit Lead"
          >
            <Edit3 className="w-4 h-4 mr-1 inline" /> Edit
          </button>
          <button
            onClick={() => handleDeleteLead(l.id)}
            className="text-theme-danger hover:opacity-80 flex items-center font-semibold cursor-pointer bg-transparent border-0"
            title="Delete Lead"
          >
            <Trash2 className="w-4 h-4 inline" />
          </button>
        </div>
      ),
    },
  ];

  const activeFilterChips: FilterChipDisplay[] = Object.entries(advancedFilters)
    .filter(([, v]) => v !== "" && v !== "all")
    .map(([k, v]) => {
      let label = String(v);
      if (k === "budgetMax") {
        label = `Budget < ₹${Number(v) >= 100000 ? Number(v) / 100000 + "L" : v}`;
      } else if (k === "createdDateStart") label = `Created After: ${v}`;
      else if (k === "createdDateEnd") label = `Created Before: ${v}`;
      else if (k === "followUpStart") label = `Follow Up After: ${v}`;
      else if (k === "followUpEnd") label = `Follow Up Before: ${v}`;
      else if (k === "leadNumber") label = `Lead #: ${v}`;
      else if (k === "name") label = `Name: ${v}`;
      else if (k === "phone") label = `Phone: ${v}`;
      else if (k === "email") label = `Email: ${v}`;
      else if (k === "leadMedium") label = `Medium: ${v}`;
      else if (k === "assignedTo") {
        const agent = users.find((u) => u.id === v);
        label = `Assigned To: ${agent ? agent.username : v}`;
      } else if (k === "source") label = `Source: ${v}`;
      else if (k === "status") label = `Status: ${v}`;
      else if (k === "dateRange") label = `Date: ${v}`;
      return { id: k, label };
    });

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center mb-3 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {checkedLeadIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedCampaignLeadIds(checkedLeadIds);
                setIsCampaignModalOpen(true);
              }}
              className="inline-flex items-center px-2.5 h-8 bg-theme-accent hover:opacity-90 text-theme-accent-fg rounded-lg text-[11px] font-bold transition-colors cursor-pointer border-0"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Campaign ({checkedLeadIds.length})
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center px-2.5 h-8 border border-theme-success/40 text-theme-success bg-theme-card rounded-lg text-[11px] font-bold hover:bg-theme-success/10 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export
          </button>
          <button
            type="button"
            onClick={() => setIsBulkImportOpen(true)}
            className="inline-flex items-center px-2.5 h-8 border border-theme-border text-theme-text bg-theme-card rounded-lg text-[11px] font-bold hover:bg-theme-surface transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-theme-muted" /> Import
          </button>
          <button
            type="button"
            onClick={() => handleOpenLeadModal()}
            className="inline-flex items-center px-2.5 h-8 bg-theme-accent hover:opacity-90 text-theme-accent-fg rounded-lg text-[11px] font-bold transition-colors cursor-pointer border-0"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Lead
          </button>
          <select
            value={leadsViewMode}
            onChange={(e) => setLeadsViewMode(e.target.value)}
            className="px-2 h-8 rounded-lg text-[11px] font-semibold border border-theme-border bg-theme-card text-theme-text hover:bg-theme-surface focus:ring-theme-ring focus:border-theme-accent cursor-pointer outline-none transition-colors"
            title="Table View Mode"
          >
            <option value="standard">Standard</option>
            <option value="compact">Compact</option>
          </select>
          <button
            type="button"
            onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
            className={`flex items-center px-3 h-8 rounded-theme font-semibold text-[11px] transition-colors cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
              isAdvancedFilterOpen || Object.values(advancedFilters).some((v) => v !== "" && v !== "all")
                ? "bg-theme-accent-muted border-theme-border text-theme-accent"
                : "bg-theme-card border-theme-border text-theme-text hover:bg-theme-surface"
            }`}
          >
            <Filter className="w-4 h-4 mr-2" aria-hidden />
            Filters
            {Object.values(advancedFilters).filter((v) => v !== "" && v !== "all").length > 0 && (
              <span className="ml-2 bg-theme-accent text-theme-accent-fg text-[10px] py-0.5 px-1.5 rounded-theme font-semibold tabular-nums">
                {Object.values(advancedFilters).filter((v) => v !== "" && v !== "all").length}
              </span>
            )}
          </button>
        </div>
      </div>

      <LeadsFilterPanel
        isAdvancedFilterOpen={isAdvancedFilterOpen}
        advancedFilters={advancedFilters}
        setAdvancedFilters={setAdvancedFilters}
        users={users}
        isManagerial={isManagerial}
      />

      <LeadAcquisitionAnalytics leads={leads} />

      <PendingDiscountsApprovals
        leads={leads}
        projects={projects}
        updateLead={updateLeadInStore}
        logAuditEvent={logAuditEvent}
        user={user}
      />

      <div className="mb-4">
        <FilterSearchInput
          value={leadSearchQuery}
          onChange={setLeadSearchQuery}
          placeholder="Search leads by name, phone, email, status, source, medium, lead number..."
          aria-label="Search leads"
          className="w-full"
        />
      </div>

      <LeadListFilterChips
        chips={activeFilterChips}
        className="mb-4"
        onClearChip={(chip) =>
          setAdvancedFilters((prev) => ({
            ...prev,
            [chip.id]: chip.id === "dateRange" ? "all" : "",
          }))
        }
        onClearAll={() =>
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
          })
        }
      />

      <DataTable
        data={filteredLeads}
        columns={columns}
        pageSize={15}
        selectedRowIds={checkedLeadIds}
        onSelectionChange={setCheckedLeadIds}
      />

      {/* Add / Edit Lead Modal */}
      <AdminLeadModal
        key={isLeadModalOpen ? (editingLead ? editingLead.id : "new") : "closed"}
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        editingLead={editingLead}
        users={users}
        projects={projects}
        onSave={handleSaveLead}
      />

      {/* Bulk Import Leads Modal */}
      <BulkLeadImportModal
        key={isBulkImportOpen ? "open" : "closed"}
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        users={users}
        bulkAddLeads={bulkAddLeads}
        logAuditEvent={logAuditEvent}
        user={user}
      />

      {/* Bulk Campaign Dispatcher Modal */}
      <CampaignBroadcastModal
        key={isCampaignModalOpen ? `campaign-${selectedCampaignLeadIds.length}` : "closed"}
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        selectedCampaignLeadIds={selectedCampaignLeadIds}
        leads={leads}
        logAuditEvent={logAuditEvent}
        user={user}
      />

      <Dialog
        isOpen={!!pendingDeleteLeadId}
        onClose={() => setPendingDeleteLeadId(null)}
        title="Delete lead?"
        description="Are you sure you want to delete this lead?"
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={confirmDeleteLead}
      />

      <Dialog
        isOpen={!!feedbackAlert}
        onClose={() => setFeedbackAlert(null)}
        title="Unable to complete"
        description={feedbackAlert ?? ""}
        cancelLabel="OK"
      />
    </>
  );
}
