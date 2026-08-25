import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCalendarEvents } from "./useCalendarEvents";
import { Lead, Project } from "@/shared/types";
import { Deal } from "@/features/deals/types";

describe("useCalendarEvents hook", () => {
  const mockLeads: Lead[] = [
    {
      id: "lead-1",
      name: "John Callback",
      phone: "9876543210",
      status: "contacted",
      followUpDate: "2026-08-20T11:00:00.000Z",
      projectId: "proj-1",
    } as Lead,
    {
      id: "lead-2",
      name: "Alice SiteVisit",
      phone: "9876543211",
      status: "site-visit-confirmed",
      followUpDate: "2026-08-22T14:00:00.000Z",
      projectId: "proj-1",
    } as Lead,
  ];

  const mockDeals: Deal[] = [
    {
      id: "deal-1",
      title: "Plot 12 Deal",
      leadId: "lead-3",
      leadName: "Bob Deal",
      phone: "9876543212",
      stage: "token_paid",
      expectedCloseDate: "2026-08-25",
      projectId: "proj-1",
      amount: 4000000,
      assignedTo: "user-1",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
    },
  ];

  const mockProjects: Record<string, Project> = {
    "proj-1": { id: "proj-1", name: "Golden Acres Melakondaiyure" } as Project,
  };

  it("should normalize leads and deals into calendar events", () => {
    const { result } = renderHook(() =>
      useCalendarEvents({
        leads: mockLeads,
        deals: mockDeals,
        projects: mockProjects,
      })
    );

    expect(result.current.allEvents).toHaveLength(3);
    expect(result.current.allEvents[0].type).toBe("callback");
    expect(result.current.allEvents[1].type).toBe("site_visit");
    expect(result.current.allEvents[2].type).toBe("token_expiry");
  });

  it("should group events by date correctly", () => {
    const { result } = renderHook(() =>
      useCalendarEvents({
        leads: mockLeads,
        deals: mockDeals,
        projects: mockProjects,
      })
    );

    expect(result.current.eventsByDate["2026-08-20"]).toHaveLength(1);
    expect(result.current.eventsByDate["2026-08-20"][0].leadName).toBe("John Callback");
    expect(result.current.eventsByDate["2026-08-22"]).toHaveLength(1);
    expect(result.current.eventsByDate["2026-08-25"]).toHaveLength(1);
  });

  it("should filter events by eventType", () => {
    const { result } = renderHook(() =>
      useCalendarEvents({
        leads: mockLeads,
        deals: mockDeals,
        projects: mockProjects,
        selectedEventType: "site_visit",
      })
    );

    expect(result.current.filteredEvents).toHaveLength(1);
    expect(result.current.filteredEvents[0].type).toBe("site_visit");
  });

  it("should filter events by searchQuery", () => {
    const { result } = renderHook(() =>
      useCalendarEvents({
        leads: mockLeads,
        deals: mockDeals,
        projects: mockProjects,
        searchQuery: "Alice",
      })
    );

    expect(result.current.filteredEvents).toHaveLength(1);
    expect(result.current.filteredEvents[0].leadName).toBe("Alice SiteVisit");
  });
});
