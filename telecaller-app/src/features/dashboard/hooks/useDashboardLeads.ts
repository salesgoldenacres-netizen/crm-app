import { useMemo } from "react";
import { Lead, Project } from "@/shared/types";

export interface DashboardStats {
  totalAssigned: number;
  followupsToday: number;
  hotCount: number;
  overdueCount: number;
  bookedCount: number;
  newCount: number;
  rawCount: number;
  contactedCount: number;
  interestedCount: number;
  notInterestedCount: number;
  siteVisitCompletedCount: number;
  siteVisitConfirmed: number;
  rnrCount: number;
  notAttemptedCount: number;
  reEngagedCount: number;
}

export interface AdvancedFilters {
  status: string;
  source: string;
  dateRange: string;
  budgetMax: string;
}

export function useDashboardLeads(
  leads: Lead[],
  userId: string,
  userRole: string,
  todayStr: string,
  isManagerial: (role: string) => boolean,
  leadStatusFilter: string,
  advancedFilters: AdvancedFilters,
  leadSearchQuery: string,
  projects: Record<string, Project>
) {
  const computedStats = useMemo<DashboardStats>(() => {
    let totalAssigned = 0;
    let followupsToday = 0;
    let hotCount = 0;
    let overdueCount = 0;
    let bookedCount = 0;
    let newCount = 0;
    let rawCount = 0;
    let contactedCount = 0;
    let interestedCount = 0;
    let notInterestedCount = 0;
    let siteVisitCompletedCount = 0;
    let siteVisitConfirmed = 0;
    let rnrCount = 0;
    let notAttemptedCount = 0;
    let reEngagedCount = 0;

    const userIsManagerial = isManagerial(userRole);

    for (let i = 0; i < leads.length; i++) {
      const l = leads[i];
      const isAssigned = userIsManagerial || l.assignedTo === userId;
      if (!isAssigned) continue;

      totalAssigned++;
      if (l.followUpDate === todayStr) {
        followupsToday++;
      }
      if (l.priority === "hot") {
        hotCount++;
      }
      if (
        l.followUpDate &&
        l.followUpDate < todayStr &&
        l.status !== "booked" &&
        l.status !== "not-interested"
      ) {
        overdueCount++;
      }

      const status = l.status;
      if (status === "booked" || status === "reserved") {
        bookedCount++;
      } else if (status === "new") {
        newCount++;
      } else if (status === "raw") {
        rawCount++;
      } else if (status === "contacted") {
        contactedCount++;
      } else if (status === "interested") {
        interestedCount++;
      } else if (status === "not-interested") {
        notInterestedCount++;
      } else if (status === "site-visit-completed") {
        siteVisitCompletedCount++;
      } else if (status === "site-visit-confirmed") {
        siteVisitConfirmed++;
      } else if (status === "rnr") {
        rnrCount++;
      } else if (status === "not-attempted") {
        notAttemptedCount++;
      }

      if ((l.callLogs || []).some((log) => log.note && log.note.includes("[Re-Engaged]"))) {
        reEngagedCount++;
      }
    }

    return {
      totalAssigned,
      followupsToday,
      hotCount,
      overdueCount,
      bookedCount,
      newCount,
      rawCount,
      contactedCount,
      interestedCount,
      notInterestedCount,
      siteVisitCompletedCount,
      siteVisitConfirmed,
      rnrCount,
      notAttemptedCount,
      reEngagedCount,
    };
  }, [leads, userId, userRole, todayStr, isManagerial]);

  const myLeads = useMemo<Lead[]>(() => {
    return leads.filter((lead) => {
      // Telecaller only sees their assigned leads, admin sees all
      if (!isManagerial(userRole) && lead.assignedTo !== userId) return false;

      // Quick status / date filters
      if (leadStatusFilter === "today") {
        if (lead.followUpDate !== todayStr) return false;
      } else if (leadStatusFilter === "hot") {
        if (lead.priority !== "hot") return false;
      } else if (leadStatusFilter === "overdue") {
        const isOverdue =
          lead.followUpDate &&
          lead.followUpDate < todayStr &&
          lead.status !== "booked" &&
          lead.status !== "not-interested";
        if (!isOverdue) return false;
      } else if (leadStatusFilter === "booked") {
        const isBooked = lead.status === "booked" || lead.status === "reserved";
        if (!isBooked) return false;
      } else if (leadStatusFilter === "not-attempted") {
        const isNotAttempted =
          lead.status === "new" || lead.status === "not-attempted";
        if (!isNotAttempted) return false;
      } else if (leadStatusFilter === "re-engaged") {
        const isReEngaged = (lead.callLogs || []).some(
          (log) => log.note && log.note.includes("[Re-Engaged]")
        );
        if (!isReEngaged) return false;
      } else if (leadStatusFilter !== "all" && lead.status !== leadStatusFilter) {
        return false;
      }

      // Advanced Filters
      if (advancedFilters.status && lead.status !== advancedFilters.status) return false;
      if (advancedFilters.source && lead.leadSource !== advancedFilters.source) return false;

      if (advancedFilters.dateRange && advancedFilters.dateRange !== "all") {
        const createdDate = new Date(lead.createdAt || "");
        const today = new Date();
        if (advancedFilters.dateRange === "today") {
          if (createdDate.toDateString() !== today.toDateString()) return false;
        } else if (advancedFilters.dateRange === "week") {
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (createdDate < weekAgo) return false;
        } else if (advancedFilters.dateRange === "month") {
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (createdDate < monthAgo) return false;
        }
      }

      if (advancedFilters.budgetMax) {
        const budgetLimit = parseFloat(advancedFilters.budgetMax);
        let leadBudget = 0;
        if (lead.plotId && lead.projectId) {
          const project = projects[lead.projectId];
          const plot = project?.plots?.find((p) => p.id === lead.plotId);
          if (plot && plot.price) {
            leadBudget = parseFloat(plot.price.replace(/,/g, ""));
          }
        }
        if (leadBudget > budgetLimit * 100000) return false; // budgetMax is in Lakhs
      }

      // Search query
      if (leadSearchQuery.trim() !== "") {
        const q = leadSearchQuery.toLowerCase();
        const matchName = lead.name?.toLowerCase().includes(q);
        const matchPhone = lead.phone?.includes(q);
        const matchPlot = lead.plotId?.toLowerCase().includes(q);
        const matchProject = projects[lead.projectId || ""]?.name
          .toLowerCase()
          .includes(q);
        return matchName || matchPhone || matchPlot || matchProject;
      }

      return true;
    });
  }, [leads, userId, userRole, todayStr, isManagerial, leadStatusFilter, advancedFilters, leadSearchQuery, projects]);

  return { myLeads, computedStats };
}
