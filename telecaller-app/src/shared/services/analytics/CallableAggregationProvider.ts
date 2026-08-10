import { AnalyticsProvider } from "./analyticsContracts";
import { AnalyticsError } from "./analyticsErrors";
import {
  DashboardMetrics,
  ActivityMetrics,
  LeadPipelineMetrics,
  BookingMetrics,
  TeamMetrics,
} from "./analyticsTypes";
import { fetchLeadPipelineCounts } from "@/shared/services/leads/leadsSec1Api";

/**
 * CallableAggregationProvider (SEC-1)
 * Server-side count() via getLeadPipelineCounts callable — no cross-owner client scans.
 */
export class CallableAggregationProvider implements AnalyticsProvider {
  private async loadCounts(projectId?: string, assignedToUsername?: string) {
    try {
      return await fetchLeadPipelineCounts({ projectId, assignedToUsername });
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Callable aggregation failed.";
      throw new AnalyticsError("COUNT_FAILED", errMsg);
    }
  }

  public async getDashboardMetrics(
    projectId?: string,
    username?: string,
  ): Promise<DashboardMetrics> {
    try {
      const counts = await this.loadCounts(projectId, username);
      return {
        callsLoggedToday: counts.callsLoggedToday,
        callTarget: 50,
        bookingsToday: counts.bookedCount + counts.reservedCount,
        bookingTarget: 5,
        pipelineStats: {
          newCount: counts.newCount,
          contactedCount: counts.contactedCount,
          interestedCount: counts.interestedCount,
          bookedCount: counts.bookedCount + counts.reservedCount,
          totalCount: counts.totalCount,
        },
        leaderboard: [],
      };
    } catch (err: unknown) {
      if (err instanceof AnalyticsError) throw err;
      const errMsg =
        err instanceof Error ? err.message : "Aggregation provider failed.";
      throw new AnalyticsError("PROVIDER_UNAVAILABLE", errMsg);
    }
  }

  public async getActivityMetrics(
    projectId?: string,
    username?: string,
  ): Promise<ActivityMetrics> {
    if (!username) {
      throw new AnalyticsError("PROJECT_SCOPE_REQUIRED", "Username is required.");
    }
    try {
      const counts = await this.loadCounts(projectId, username);
      return {
        callsCompleted: counts.callsLoggedToday,
        followupsDue: 0,
        dialerMinutes: 0,
        timelineActivities: [],
      };
    } catch (err: unknown) {
      if (err instanceof AnalyticsError) throw err;
      const errMsg =
        err instanceof Error ? err.message : "Aggregation provider failed.";
      throw new AnalyticsError("PROVIDER_UNAVAILABLE", errMsg);
    }
  }

  public async getPipelineMetrics(projectId?: string): Promise<LeadPipelineMetrics> {
    try {
      const counts = await this.loadCounts(projectId);
      return {
        stages: {
          new: counts.newCount,
          contacted: counts.contactedCount,
          interested: counts.interestedCount,
          booked: counts.bookedCount,
        },
        totalCount: counts.totalCount,
        unassignedCount: 0,
      };
    } catch (err: unknown) {
      if (err instanceof AnalyticsError) throw err;
      const errMsg =
        err instanceof Error ? err.message : "Aggregation provider failed.";
      throw new AnalyticsError("PROVIDER_UNAVAILABLE", errMsg);
    }
  }

  public async getBookingMetrics(projectId?: string): Promise<BookingMetrics> {
    try {
      const counts = await this.loadCounts(projectId);
      return {
        totalBookings: counts.bookedCount,
        bookingTarget: 10,
        totalReserved: counts.reservedCount,
        conversionRate:
          counts.totalCount > 0
            ? (counts.bookedCount / counts.totalCount) * 100
            : 0,
      };
    } catch (err: unknown) {
      if (err instanceof AnalyticsError) throw err;
      const errMsg =
        err instanceof Error ? err.message : "Aggregation provider failed.";
      throw new AnalyticsError("PROVIDER_UNAVAILABLE", errMsg);
    }
  }

  public async getTeamMetrics(_projectId?: string): Promise<TeamMetrics> {
    return {
      teamGoals: [],
      rankings: [],
    };
  }
}
