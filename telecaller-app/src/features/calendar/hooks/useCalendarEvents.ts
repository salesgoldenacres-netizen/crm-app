import { useMemo } from "react";
import { Lead, Project } from "@/shared/types";
import { Deal } from "@/features/deals/types";
import { CalendarEvent, CalendarEventType } from "../types";

interface UseCalendarEventsProps {
  leads: Lead[];
  deals: Deal[];
  projects: Record<string, Project>;
  selectedEventType?: string;
  selectedProjectId?: string;
  searchQuery?: string;
}

export function useCalendarEvents({
  leads,
  deals,
  projects,
  selectedEventType = "all",
  selectedProjectId = "all",
  searchQuery = "",
}: UseCalendarEventsProps) {
  const events: CalendarEvent[] = useMemo(() => {
    const eventList: CalendarEvent[] = [];

    // 1. Process Leads for Callbacks & Site Visits
    leads.forEach((lead) => {
      const followUp = lead.followUpDate || lead.followUpOn;
      if (!followUp) return;

      // Extract date string YYYY-MM-DD
      const dateYmd = followUp.includes("T") ? followUp.split("T")[0] : followUp;

      const isSiteVisit =
        lead.status === "site-visit-confirmed" ||
        lead.status === "site-visit-completed";

      const eventType: CalendarEventType = isSiteVisit ? "site_visit" : "callback";

      const projectName = lead.projectId ? projects[lead.projectId]?.name : undefined;

      eventList.push({
        id: `lead-event-${lead.id}`,
        title: isSiteVisit
          ? `Site Visit — ${lead.name}`
          : `Callback Follow-up — ${lead.name}`,
        leadId: lead.id,
        leadName: lead.name,
        phone: lead.phone,
        email: lead.email,
        type: eventType,
        date: dateYmd,
        time: (followUp.includes("T") && followUp.split("T")[1]?.slice(0, 5)) || "10:00",
        status: lead.status,
        priority: lead.priority as "hot" | "warm" | "cold" | undefined,
        projectId: lead.projectId,
        projectName,
        plotNumber: lead.plotId,
        assignedTo: lead.assignedTo,
        notes: lead.notes,
      });
    });

    // 2. Process Deals for Deal Closings & Token Expiries
    deals.forEach((deal) => {
      if (!deal.expectedCloseDate) return;

      const dateYmd = deal.expectedCloseDate.includes("T")
        ? deal.expectedCloseDate.split("T")[0]
        : deal.expectedCloseDate;

      const isToken = deal.stage === "token_paid";
      const eventType: CalendarEventType = isToken ? "token_expiry" : "deal_closing";

      eventList.push({
        id: `deal-event-${deal.id}`,
        title: deal.title,
        leadId: deal.leadId,
        leadName: deal.leadName,
        phone: deal.phone,
        email: deal.email,
        type: eventType,
        date: dateYmd,
        time: "12:00",
        status: deal.stage,
        projectId: deal.projectId,
        projectName: deal.projectName || projects[deal.projectId]?.name,
        plotNumber: deal.plotNumber,
        assignedTo: deal.assignedTo,
        notes: deal.notes,
        amount: deal.amount,
      });
    });

    // Sort by date & time ascending
    eventList.sort((a, b) => {
      const dateA = `${a.date} ${a.time || "00:00"}`;
      const dateB = `${b.date} ${b.time || "00:00"}`;
      return dateA.localeCompare(dateB);
    });

    return eventList;
  }, [leads, deals, projects]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return events.filter((evt) => {
      const matchesType = selectedEventType === "all" || evt.type === selectedEventType;
      const matchesProject = selectedProjectId === "all" || evt.projectId === selectedProjectId;

      const matchesSearch =
        !q ||
        evt.title.toLowerCase().includes(q) ||
        evt.leadName.toLowerCase().includes(q) ||
        evt.phone.includes(q) ||
        (evt.plotNumber && evt.plotNumber.toLowerCase().includes(q)) ||
        (evt.projectName && evt.projectName.toLowerCase().includes(q));

      return matchesType && matchesProject && matchesSearch;
    });
  }, [events, selectedEventType, selectedProjectId, searchQuery]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((evt) => {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    });
    return map;
  }, [filteredEvents]);

  return {
    allEvents: events,
    filteredEvents,
    eventsByDate,
  };
}
