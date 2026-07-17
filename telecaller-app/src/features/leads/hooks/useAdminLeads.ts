import { useState, useMemo } from "react";
import { Lead, User, Project, AuditLog } from "@/shared/types";
import { safeFormatDateTime } from "@/shared/utils/dateUtils";

interface UseAdminLeadsProps {
  user: User;
  leads: Lead[];
  projects: Record<string, Project>;
  users: User[];
  addLead: (l: Partial<Lead> & { name: string; phone: string }) => Promise<Lead | { isDuplicate: boolean }>;
  updateLead: (id: string, l: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  logAuditEvent: (eventData: Partial<AuditLog>) => Promise<void>;
}

export function useAdminLeads({
  user,
  leads,
  projects,
  users,
  addLead,
  updateLead,
  deleteLead,
  logAuditEvent,
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

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      let keep = true;
      if (advancedFilters.status && lead.status !== advancedFilters.status) keep = false;
      if (advancedFilters.source && lead.leadSource !== advancedFilters.source) keep = false;
      if (advancedFilters.leadMedium && lead.leadMedium !== advancedFilters.leadMedium) keep = false;
      if (advancedFilters.assignedTo && lead.assignedTo !== advancedFilters.assignedTo) keep = false;

      if (
        advancedFilters.leadNumber &&
        !lead.leadNumber?.toLowerCase().includes(advancedFilters.leadNumber.toLowerCase())
      )
        keep = false;
      if (advancedFilters.name && !lead.name?.toLowerCase().includes(advancedFilters.name.toLowerCase()))
        keep = false;
      if (advancedFilters.phone && !lead.phone?.includes(advancedFilters.phone)) keep = false;
      if (advancedFilters.email && !lead.email?.toLowerCase().includes(advancedFilters.email.toLowerCase()))
        keep = false;

      if (advancedFilters.followUpStart) {
        const start = advancedFilters.followUpStart;
        const followDate = lead.followUpDate || lead.followUpOn;
        if (!followDate || followDate < start) keep = false;
      }
      if (advancedFilters.followUpEnd) {
        const end = advancedFilters.followUpEnd;
        const followDate = lead.followUpDate || lead.followUpOn;
        if (!followDate || followDate > end) keep = false;
      }
      if (advancedFilters.createdDateStart) {
        const start = new Date(advancedFilters.createdDateStart);
        start.setHours(0, 0, 0, 0);
        const leadDate = new Date(lead.createdAt || lead.createdTime || "");
        if (leadDate < start) keep = false;
      }
      if (advancedFilters.createdDateEnd) {
        const end = new Date(advancedFilters.createdDateEnd);
        end.setHours(23, 59, 59, 999);
        const leadDate = new Date(lead.createdAt || lead.createdTime || "");
        if (leadDate > end) keep = false;
      }

      if (advancedFilters.dateRange && advancedFilters.dateRange !== "all") {
        const leadDate = new Date(lead.createdAt || lead.createdTime || "");
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - leadDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (advancedFilters.dateRange === "today" && diffDays > 1) keep = false;
        if (advancedFilters.dateRange === "week" && diffDays > 7) keep = false;
        if (advancedFilters.dateRange === "month" && diffDays > 30) keep = false;
      }
      if (advancedFilters.budgetMax) {
        const budget = Number(advancedFilters.budgetMax);
        const leadBudget = Number(lead.budget) || 0;
        if (leadBudget > budget) keep = false;
      }

      if (keep && leadSearchQuery.trim() !== "") {
        const q = leadSearchQuery.toLowerCase();
        if (q.includes(",")) {
          const terms = q
            .split(/,\s*/)
            .map((t) => t.trim())
            .filter(Boolean);
          keep = terms.some((term) => {
            const leadDateStr = safeFormatDateTime(lead.createdTime || lead.createdAt)?.toLowerCase() || "";
            const followUpStr = (lead.followUpOn || lead.followUpDate)?.toLowerCase() || "";
            return (
              lead.name?.toLowerCase().includes(term) ||
              lead.phone?.includes(term) ||
              lead.plotId?.toLowerCase().includes(term) ||
              lead.email?.toLowerCase().includes(term) ||
              lead.assignedToName?.toLowerCase().includes(term) ||
              lead.leadSource?.toLowerCase().includes(term) ||
              lead.leadMedium?.toLowerCase().includes(term) ||
              lead.leadNumber?.toLowerCase().includes(term) ||
              lead.status?.toLowerCase().includes(term) ||
              followUpStr.includes(term) ||
              leadDateStr.includes(term) ||
              (lead.projectId && projects[lead.projectId]?.name.toLowerCase().includes(term))
            );
          });
        } else {
          const matchName = lead.name?.toLowerCase().includes(q);
          const matchPhone = lead.phone?.includes(q);
          const matchPlot = lead.plotId?.toLowerCase().includes(q);
          const matchEmail = lead.email?.toLowerCase().includes(q);
          const matchAgent = lead.assignedToName?.toLowerCase().includes(q);
          const matchSource = lead.leadSource?.toLowerCase().includes(q);
          const matchMedium = lead.leadMedium?.toLowerCase().includes(q);
          const matchNumber = lead.leadNumber?.toLowerCase().includes(q);
          const matchStatus = lead.status?.toLowerCase().includes(q);
          const matchFollowUp = (lead.followUpOn || lead.followUpDate)?.toLowerCase().includes(q);
          const matchCreated = safeFormatDateTime(lead.createdTime || lead.createdAt)?.toLowerCase().includes(q);
          const matchProject = lead.projectId && projects[lead.projectId]?.name.toLowerCase().includes(q);
          keep = !!(
            matchName ||
            matchPhone ||
            matchPlot ||
            matchEmail ||
            matchAgent ||
            matchSource ||
            matchMedium ||
            matchNumber ||
            matchStatus ||
            matchFollowUp ||
            matchCreated ||
            matchProject
          );
        }
      }

      return keep;
    });
  }, [leads, advancedFilters, leadSearchQuery, projects]);

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
    setPendingDeleteLeadId(null);
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
  };

  const handleExportCSV = async () => {
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
    const rows = leads.map((l) => [
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
    a.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    await logAuditEvent({
      action: "Export Leads CSV",
      details: `Exported leads data (${leads.length} records) to CSV.`,
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
  };
}
