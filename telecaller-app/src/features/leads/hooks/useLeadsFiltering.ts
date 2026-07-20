import { useMemo } from "react";
import { Lead, User, Project } from "@/shared/types";
import { isManagerial } from "@/shared/utils/roleUtils";
import { LeadListFilters } from "@/features/leads/config/leadListFilterConfig";

export function useLeadsFiltering(
  leads: Lead[],
  user: User,
  appliedFilters: LeadListFilters,
  _projects: Record<string, Project>,
  todayStr: string
) {
  const isLeadIdle = (lead: Lead) => {
    if (!lead.updatedAt) return false;
    const lastUpdate = new Date(lead.updatedAt);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return (
      lastUpdate < threeDaysAgo &&
      lead.status !== "booked" &&
      lead.status !== "not-interested"
    );
  };

  const myLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (!isManagerial(user.role) && lead.assignedTo !== user.id) return false;

      const f = appliedFilters;

      if (f.queueMode === "overdue") {
        const isOverdue =
          lead.followUpDate &&
          lead.followUpDate < todayStr &&
          lead.status !== "booked" &&
          lead.status !== "not-interested";
        if (!isOverdue) return false;
      }

      if (f.statuses.length > 0 && !f.statuses.includes(lead.status || "")) {
        return false;
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
      if (f.name) {
        const q = f.name.toLowerCase();
        const matchName = lead.name?.toLowerCase().includes(q);
        const matchPhone = lead.phone?.includes(f.name);
        if (!matchName && !matchPhone) return false;
      }
      if (f.phone && !lead.phone?.includes(f.phone)) return false;
      if (
        f.email &&
        !lead.email?.toLowerCase().includes(f.email.toLowerCase())
      ) {
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
  }, [leads, user.id, user.role, appliedFilters, todayStr]);

  const stats = useMemo(() => {
    const isUserLead = (l: Lead) =>
      isManagerial(user.role) || l.assignedTo === user.id;

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
    let notAttemptedCount = 0;
    let siteVisitCompletedCount = 0;
    let siteVisitConfirmed = 0;
    let rnrCount = 0;
    let reEngagedCount = 0;

    leads.forEach((l) => {
      if (!isUserLead(l)) return;

      totalAssigned++;
      if (l.followUpDate === todayStr) followupsToday++;
      if (l.priority === "hot") hotCount++;
      const isOverdue =
        l.followUpDate &&
        l.followUpDate < todayStr &&
        l.status !== "booked" &&
        l.status !== "not-interested";
      if (isOverdue) overdueCount++;
      if (l.status === "booked" || l.status === "reserved") bookedCount++;
      if (l.status === "new") newCount++;
      if (l.status === "raw") rawCount++;
      if (l.status === "contacted") contactedCount++;
      if (l.status === "interested") interestedCount++;
      if (l.status === "not-interested") notInterestedCount++;
      if (l.status === "new" || l.status === "not-attempted") notAttemptedCount++;
      if (l.status === "site-visit-completed") siteVisitCompletedCount++;
      if (l.status === "site-visit-confirmed") siteVisitConfirmed++;
      if (l.status === "rnr") rnrCount++;
      const isReEngaged = (l.callLogs || []).some(
        (log) => log.note && log.note.includes("[Re-Engaged]")
      );
      if (isReEngaged) reEngagedCount++;
    });

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
      notAttemptedCount,
      siteVisitCompletedCount,
      siteVisitConfirmed,
      rnrCount,
      reEngagedCount,
    };
  }, [leads, user.id, user.role, todayStr]);

  const followUpAlertLeads = useMemo(() => {
    return leads.filter(
      (l) =>
        (isManagerial(user.role) || l.assignedTo === user.id) &&
        l.followUpDate === todayStr &&
        l.status !== "booked" &&
        l.status !== "not-interested"
    );
  }, [leads, user.id, user.role, todayStr]);

  return {
    myLeads,
    stats,
    followUpAlertLeads,
    isLeadIdle,
  };
}
