import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import { AnalyticsProvider } from "./analyticsContracts";
import { AnalyticsError } from "./analyticsErrors";
import {
  DashboardMetrics,
  ActivityMetrics,
  LeadPipelineMetrics,
  BookingMetrics,
  TeamMetrics,
} from "./analyticsTypes";

/**
 * FirestoreAggregationProvider (Wave 8 Phase 2C - Tier 4)
 * Executes native Firestore server-side count() queries.
 * Prevents client-side collection scans and downloads.
 */
export class FirestoreAggregationProvider implements AnalyticsProvider {
  private getLeadsCollection() {
    return collection(db, "leads");
  }

  private async getFilterCount(conditions: { field: string; value: any }[]): Promise<number> {
    try {
      let q = query(this.getLeadsCollection());
      conditions.forEach((c) => {
        q = query(q, where(c.field, "==", c.value));
      });
      const snap = await getCountFromServer(q);
      return snap.data().count;
    } catch (err: any) {
      throw new AnalyticsError("COUNT_FAILED", err.message || "Firestore aggregation count query failed.");
    }
  }

  public async getDashboardMetrics(projectId?: string, username?: string): Promise<DashboardMetrics> {
    const scopeConditions = projectId ? [{ field: "projectId", value: projectId }] : [];

    try {
      // Execute parallel count queries to build dashboard metrics
      const [newCount, contactedCount, interestedCount, bookedCount, reservedCount, totalCount] = await Promise.all([
        this.getFilterCount([...scopeConditions, { field: "status", value: "new" }]),
        this.getFilterCount([...scopeConditions, { field: "status", value: "contacted" }]),
        this.getFilterCount([...scopeConditions, { field: "status", value: "interested" }]),
        this.getFilterCount([...scopeConditions, { field: "status", value: "booked" }]),
        this.getFilterCount([...scopeConditions, { field: "status", value: "reserved" }]),
        this.getFilterCount(scopeConditions),
      ]);

      const callsLoggedToday = username
        ? await this.getFilterCount([...scopeConditions, { field: "assignedTo", value: username }]) // representation
        : 0;

      return {
        callsLoggedToday,
        callTarget: 50,
        bookingsToday: bookedCount + reservedCount,
        bookingTarget: 5,
        pipelineStats: {
          newCount,
          contactedCount,
          interestedCount,
          bookedCount: bookedCount + reservedCount,
          totalCount,
        },
        leaderboard: [],
      };
    } catch (err: any) {
      if (err instanceof AnalyticsError) throw err;
      throw new AnalyticsError("PROVIDER_UNAVAILABLE", err.message || "Aggregation provider failed.");
    }
  }

  public async getActivityMetrics(projectId?: string, username?: string): Promise<ActivityMetrics> {
    const scopeConditions = projectId ? [{ field: "projectId", value: projectId }] : [];
    if (!username) {
      throw new AnalyticsError("PROJECT_SCOPE_REQUIRED", "Username is required.");
    }

    try {
      const callsCompleted = await this.getFilterCount([
        ...scopeConditions,
        { field: "assignedTo", value: username },
      ]);

      return {
        callsCompleted,
        followupsDue: 0,
        dialerMinutes: 0,
        timelineActivities: [],
      };
    } catch (err: any) {
      if (err instanceof AnalyticsError) throw err;
      throw new AnalyticsError("PROVIDER_UNAVAILABLE", err.message || "Aggregation provider failed.");
    }
  }

  public async getPipelineMetrics(projectId?: string): Promise<LeadPipelineMetrics> {
    const scopeConditions = projectId ? [{ field: "projectId", value: projectId }] : [];

    try {
      const [newCount, contactedCount, interestedCount, bookedCount, totalCount] = await Promise.all([
        this.getFilterCount([...scopeConditions, { field: "status", value: "new" }]),
        this.getFilterCount([...scopeConditions, { field: "status", value: "contacted" }]),
        this.getFilterCount([...scopeConditions, { field: "status", value: "interested" }]),
        this.getFilterCount([...scopeConditions, { field: "status", value: "booked" }]),
        this.getFilterCount(scopeConditions),
      ]);

      return {
        stages: {
          new: newCount,
          contacted: contactedCount,
          interested: interestedCount,
          booked: bookedCount,
        },
        totalCount,
        unassignedCount: 0,
      };
    } catch (err: any) {
      if (err instanceof AnalyticsError) throw err;
      throw new AnalyticsError("PROVIDER_UNAVAILABLE", err.message || "Aggregation provider failed.");
    }
  }

  public async getBookingMetrics(projectId?: string): Promise<BookingMetrics> {
    const scopeConditions = projectId ? [{ field: "projectId", value: projectId }] : [];

    try {
      const [totalBookings, totalReserved, totalCount] = await Promise.all([
        this.getFilterCount([...scopeConditions, { field: "status", value: "booked" }]),
        this.getFilterCount([...scopeConditions, { field: "status", value: "reserved" }]),
        this.getFilterCount(scopeConditions),
      ]);

      return {
        totalBookings,
        bookingTarget: 10,
        totalReserved,
        conversionRate: totalCount > 0 ? (totalBookings / totalCount) * 100 : 0,
      };
    } catch (err: any) {
      if (err instanceof AnalyticsError) throw err;
      throw new AnalyticsError("PROVIDER_UNAVAILABLE", err.message || "Aggregation provider failed.");
    }
  }

  public async getTeamMetrics(_projectId?: string): Promise<TeamMetrics> {
    return {
      teamGoals: [],
      rankings: [],
    };
  }
}
