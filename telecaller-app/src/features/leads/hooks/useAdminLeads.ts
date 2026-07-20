import { useState } from "react";
import { Lead, User, Project, AuditLog } from "@/shared/types";
import { safeFormatDateTime } from "@/shared/utils/dateUtils";

interface UseAdminLeadsProps {
  user: User;
  projects: Record<string, Project>;
  users: User[];
  addLead: (l: Partial<Lead> & { name: string; phone: string }) => Promise<Lead | { isDuplicate: boolean }>;
  updateLead: (id: string, l: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  logAuditEvent: (eventData: Partial<AuditLog>) => Promise<void>;
  onMutated?: () => void;
}

export function useAdminLeads({
  user,
  projects,
  users,
  addLead,
  updateLead,
  deleteLead,
  logAuditEvent,
  onMutated,
}: UseAdminLeadsProps) {
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [leadsViewMode, setLeadsViewMode] = useState("standard");
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState({
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

  /** Selection is identity-based — IDs only. */
  const [checkedLeadIds, setCheckedLeadIds] = useState<string[]>([]);
  const escalationDays = 5;

  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [selectedCampaignLeadIds, setSelectedCampaignLeadIds] = useState<string[]>([]);
  const [pendingDeleteLeadId, setPendingDeleteLeadId] = useState<string | null>(null);
  const [feedbackAlert, setFeedbackAlert] = useState<string | null>(null);

  const checkSlaBreach = (lead: Lead) => {
    const createdTime = new Date(lead.createdTime || lead.createdAt || "");
    const now = new Date();
    const diffHours = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
    const agentCalls = (lead.callLogs || []).filter(
      (log) =>
        log.agent !== "system" &&
        log.agent !== "System (Auto)" &&
        log.agent !== "system_webhook"
    );
    return diffHours > 24 && agentCalls.length === 0;
  };

  const checkStatusEscalation = (lead: Lead, daysThreshold = 5) => {
    if (["booked", "not-interested"].includes(lead.status)) return false;
    const updatedTime = new Date(lead.updatedAt || lead.createdAt || "");
    const now = new Date();
    const diffDays = (now.getTime() - updatedTime.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > daysThreshold;
  };

  const handleOpenLeadModal = (leadToEdit: Lead | null = null) => {
    setEditingLead(leadToEdit);
    setIsLeadModalOpen(true);
  };

  const handleSaveLead = async (leadFormValues: Partial<Lead>) => {
    const selectedTC = users.find((u) => u.id === leadFormValues.assignedTo);
    const assignedToName = selectedTC ? selectedTC.username : "Unassigned";

    let changes: Record<string, { before: unknown; after: unknown }> | null = null;
    if (editingLead) {
      changes = {};
      const fieldsToCompare = [
        "name",
        "phone",
        "email",
        "projectId",
        "plotId",
        "status",
        "assignedTo",
        "priority",
        "followUpOn",
        "notes",
      ];
      fieldsToCompare.forEach((k) => {
        const oldVal = (editingLead as unknown as Record<string, unknown>)[k] || "";
        const newVal = (leadFormValues as Record<string, unknown>)[k] || "";
        if (oldVal !== newVal) {
          changes![k] = { before: oldVal, after: newVal };
        }
      });
      await updateLead(editingLead.id, {
        ...leadFormValues,
        assignedToName,
      });
    } else {
      await addLead({
        ...leadFormValues,
        assignedToName,
      } as Partial<Lead> & { name: string; phone: string });
    }
    await logAuditEvent({
      action: editingLead ? "Modify Lead" : "Create Lead",
      details:
        `Customer: ${leadFormValues.name}, Status: ${leadFormValues.status}` +
        (changes ? ` | Changes: ${JSON.stringify(changes)}` : ""),
      user: user.username,
      changes,
    });
    setIsLeadModalOpen(false);
    onMutated?.();
  };

  const handleDeleteLead = (leadId: string) => {
    setPendingDeleteLeadId(leadId);
  };

  const confirmDeleteLead = async () => {
    if (!pendingDeleteLeadId) return;
    await deleteLead(pendingDeleteLeadId);
    await logAuditEvent({
      action: "Delete Lead",
      details: `Lead ID: ${pendingDeleteLeadId}`,
      user: user.username,
    });
    setCheckedLeadIds((ids) => ids.filter((id) => id !== pendingDeleteLeadId));
    setPendingDeleteLeadId(null);
    onMutated?.();
  };

  const handleAssigneeChange = async (leadId: string, userId: string) => {
    const selectedTC = users.find((u) => u.id === userId);
    const assignedToName = selectedTC ? selectedTC.username : "Unassigned";
    await updateLead(leadId, { assignedTo: userId, assignedToName });
    await logAuditEvent({
      action: "Reassign Lead",
      details: `Lead ID: ${leadId} assigned to agent: ${assignedToName}`,
      user: user.username,
    });
    onMutated?.();
  };

  /** Export current LeadQueryService page only (not company-wide). */
  const handleExportCSV = async (pageLeads: Lead[]) => {
    if (user.allowExport === false) {
      setFeedbackAlert(
        "Permission Denied: You do not have permissions to export lead data."
      );
      return;
    }
    const headers = [
      "Name",
      "Phone",
      "Email",
      "Project",
      "Plot",
      "Assigned To",
      "Status",
      "Priority",
      "Notes",
      "Created At",
    ];
    const rows = pageLeads.map((l) => [
      l.name || "",
      l.phone || "",
      l.email || "",
      projects[l.projectId || ""]?.name || "",
      l.plotId || "",
      users.find((u) => u.id === l.assignedTo)?.username || "",
      l.status || "",
      l.priority || "",
      (l.notes || "").replace(/,/g, ";"),
      l.createdAt ? safeFormatDateTime(l.createdAt, false) : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_export_page_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    await logAuditEvent({
      action: "Export Leads CSV",
      details: `Exported current page (${pageLeads.length} records) to CSV.`,
      user: user.username,
    });
  };

  return {
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
    setEditingLead,
    isBulkImportOpen,
    setIsBulkImportOpen,
    isCampaignModalOpen,
    setIsCampaignModalOpen,
    selectedCampaignLeadIds,
    setSelectedCampaignLeadIds,
    checkSlaBreach,
    checkStatusEscalation,
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
  };
}
