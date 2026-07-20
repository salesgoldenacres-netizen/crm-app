import type { Lead } from "@/shared/types";
import type { LeadClientFilters } from "./leadQueryTypes";

/**
 * Refine a server page in memory. Does not re-query Firestore.
 * Grouped / Kanban views receive one page then group/virtualize this set.
 */
export function applyLeadClientFilters(
  items: readonly Lead[],
  filters: LeadClientFilters,
): Lead[] {
  const f = filters;
  const todayStr = f.todayStr || "";

  return items.filter((lead) => {
    if (f.queueMode === "overdue") {
      const isOverdue =
        !!lead.followUpDate &&
        lead.followUpDate < todayStr &&
        lead.status !== "booked" &&
        lead.status !== "not-interested";
      if (!isOverdue) return false;
    }

    if (f.statuses && f.statuses.length > 0) {
      if (!f.statuses.includes(lead.status || "")) return false;
    }
    if (f.source && lead.leadSource !== f.source) return false;
    if (f.projectId && lead.projectId !== f.projectId) return false;
    if (f.priority) {
      const leadPriority = lead.priority || "warm";
      if (leadPriority !== f.priority) return false;
    }
    if (f.assignedTo && lead.assignedTo !== f.assignedTo) return false;

    if (
      f.leadNumber &&
      !lead.leadNumber?.toLowerCase().includes(f.leadNumber.toLowerCase()) &&
      !lead.leadReference?.toLowerCase().includes(f.leadNumber.toLowerCase())
    ) {
      return false;
    }

    const nameOrSearch = f.name || f.search;
    if (nameOrSearch) {
      const q = nameOrSearch.toLowerCase();
      const matchName = lead.name?.toLowerCase().includes(q);
      const matchPhone = lead.phone?.includes(nameOrSearch);
      if (!matchName && !matchPhone) return false;
    }
    if (f.phone && !lead.phone?.includes(f.phone)) return false;
    if (f.email && !lead.email?.toLowerCase().includes(f.email.toLowerCase())) {
      return false;
    }
    if (f.leadMedium && lead.leadMedium !== f.leadMedium) return false;

    if (f.followUpStart) {
      const followDate = lead.followUpDate || lead.followUpOn;
      if (!followDate || followDate < f.followUpStart) return false;
    }
    if (f.followUpEnd) {
      const followDate = lead.followUpDate || lead.followUpOn;
      if (!followDate || followDate > f.followUpEnd) return false;
    }
    if (f.createdDateStart) {
      const start = new Date(f.createdDateStart);
      start.setHours(0, 0, 0, 0);
      const leadDate = new Date(lead.createdAt || lead.createdTime || "");
      if (Number.isNaN(leadDate.getTime()) || leadDate < start) return false;
    }
    if (f.createdDateEnd) {
      const end = new Date(f.createdDateEnd);
      end.setHours(23, 59, 59, 999);
      const leadDate = new Date(lead.createdAt || lead.createdTime || "");
      if (Number.isNaN(leadDate.getTime()) || leadDate > end) return false;
    }

    return true;
  });
}
