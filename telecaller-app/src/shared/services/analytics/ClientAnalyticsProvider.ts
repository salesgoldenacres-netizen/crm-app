import { Lead, User } from "@/shared/types";
import { AnalyticsProvider } from "./analyticsContracts";
import {
  DashboardMetrics,
  ActivityMetrics,
  LeadPipelineMetrics,
  BookingMetrics,
  TeamMetrics,
} from "./analyticsTypes";

/**
 * ClientAnalyticsProvider (Wave 8 Phase 2C - Tier 1)
 * Computes metrics strictly in-memory from already-loaded client store data.
 * Guarantees zero database read requests or network listeners.
 */
export class ClientAnalyticsProvider implements AnalyticsProvider {
  private getLeads: () => Lead[];
  private getUsers: () => User[];
  private getTargets: () => Record<string, { targetCount?: number }>;
  private getGoals: () => { target?: number; achieved?: number; label?: string }[];

  constructor(
    getLeads: () => Lead[],
    getUsers: () => User[],
    getTargets: () => Record<string, { targetCount?: number }>,
    getGoals: () => { target?: number; achieved?: number; label?: string }[]
  ) {
    this.getLeads = getLeads;
    this.getUsers = getUsers;
    this.getTargets = getTargets;
    this.getGoals = getGoals;
  }

  private getISTDateStr(dateVal: Date) {
    const offset = 5.5 * 60 * 60 * 1000; // IST
    return new Date(dateVal.getTime() + offset).toISOString().split("T")[0];
  }

  public async getDashboardMetrics(projectId?: string, username?: string): Promise<DashboardMetrics> {
    const leads = this.getLeads();
    const todayStr = this.getISTDateStr(new Date());

    const filteredLeads = projectId
      ? leads.filter((l) => l.projectId === projectId)
      : leads;

    // Daily Calls Logged
    const callsLoggedToday = filteredLeads.reduce((acc, lead) => {
      const todayLogs = (lead.callLogs || []).filter((log) => {
        if (!log.date) return false;
        const logDateStr = this.getISTDateStr(new Date(log.date));
        return (
          log.agent === username &&
          logDateStr === todayStr &&
          !(log.note || "").includes("[WhatsApp")
        );
      });
      return acc + todayLogs.length;
    }, 0);

    // Targets
    const targetMap = this.getTargets();
    const userObj = this.getUsers().find((u) => u.username === username);
    const callTarget = userObj ? (targetMap[userObj.id]?.targetCount || 50) : 50;

    // Bookings Today
    const bookingsToday = filteredLeads.filter(
      (l) => (l.status === "booked" || l.status === "reserved") && l.followUpDate === todayStr
    ).length;

    // Pipeline Stats
    const pipelineStats = {
      newCount: filteredLeads.filter((l) => l.status === "new").length,
      contactedCount: filteredLeads.filter((l) => l.status === "contacted").length,
      interestedCount: filteredLeads.filter((l) => l.status === "interested").length,
      bookedCount: filteredLeads.filter((l) => l.status === "booked" || l.status === "reserved").length,
      totalCount: filteredLeads.length,
    };

    // Leaderboard
    const agentCalls: Record<string, number> = {};
    const agentBookings: Record<string, number> = {};

    filteredLeads.forEach((l) => {
      const todayLogs = (l.callLogs || []).filter((log) => {
        if (!log.date) return false;
        return this.getISTDateStr(new Date(log.date)) === todayStr;
      });
      todayLogs.forEach((log) => {
        if (log.agent) {
          agentCalls[log.agent] = (agentCalls[log.agent] || 0) + 1;
        }
      });

      if (l.status === "booked" || l.status === "reserved") {
        const agent = l.assignedTo || "unassigned";
        agentBookings[agent] = (agentBookings[agent] || 0) + 1;
      }
    });

    const leaderboard = this.getUsers().map((u) => ({
      agentName: u.username,
      callsCount: agentCalls[u.username] || 0,
      bookingsCount: agentBookings[u.id] || 0,
    })).sort((a, b) => b.callsCount - a.callsCount);

    return {
      callsLoggedToday,
      callTarget,
      bookingsToday,
      bookingTarget: 5, // Default monthly target placeholder
      pipelineStats,
      leaderboard,
    };
  }

  public async getActivityMetrics(projectId?: string, username?: string): Promise<ActivityMetrics> {
    const leads = this.getLeads();
    const todayStr = this.getISTDateStr(new Date());

    const filteredLeads = projectId
      ? leads.filter((l) => l.projectId === projectId)
      : leads;

    const myLeads = username
      ? filteredLeads.filter((l) => {
          const userObj = this.getUsers().find((u) => u.username === username);
          return l.assignedTo === (userObj ? userObj.id : "");
        })
      : filteredLeads;

    const callsCompleted = myLeads.reduce((acc, l) => {
      const todayLogs = (l.callLogs || []).filter((log) => {
        if (!log.date) return false;
        return (
          this.getISTDateStr(new Date(log.date)) === todayStr &&
          log.agent === username
        );
      });
      return acc + todayLogs.length;
    }, 0);

    const followupsDue = myLeads.filter((l) => l.followUpDate === todayStr).length;

    return {
      callsCompleted,
      followupsDue,
      dialerMinutes: Math.round(callsCompleted * 1.5), // Estimate based on call counts
      timelineActivities: [],
    };
  }

  public async getPipelineMetrics(projectId?: string): Promise<LeadPipelineMetrics> {
    const leads = this.getLeads();
    const filteredLeads = projectId ? leads.filter((l) => l.projectId === projectId) : leads;

    const stages: Record<string, number> = {};
    filteredLeads.forEach((l) => {
      const status = l.status || "new";
      stages[status] = (stages[status] || 0) + 1;
    });

    return {
      stages,
      totalCount: filteredLeads.length,
      unassignedCount: filteredLeads.filter((l) => !l.assignedTo).length,
    };
  }

  public async getBookingMetrics(projectId?: string): Promise<BookingMetrics> {
    const leads = this.getLeads();
    const filteredLeads = projectId ? leads.filter((l) => l.projectId === projectId) : leads;

    const totalBookings = filteredLeads.filter((l) => l.status === "booked").length;
    const totalReserved = filteredLeads.filter((l) => l.status === "reserved").length;

    return {
      totalBookings,
      bookingTarget: 10,
      totalReserved,
      conversionRate: filteredLeads.length > 0 ? (totalBookings / filteredLeads.length) * 100 : 0,
    };
  }

  public async getTeamMetrics(_projectId?: string): Promise<TeamMetrics> {
    const rawGoals = this.getGoals();
    const teamGoals = rawGoals.map((g) => ({
      target: g.target || 0,
      achieved: g.achieved || 0,
      label: g.label || "Goal",
    }));

    return {
      teamGoals,
      rankings: [],
    };
  }
}
