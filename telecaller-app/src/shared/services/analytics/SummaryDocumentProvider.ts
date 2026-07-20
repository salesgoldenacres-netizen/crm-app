import { doc, getDoc } from "firebase/firestore";
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
 * SummaryDocumentProvider (Wave 8 Phase 2C - Tiers 2 & 3)
 * Fetches pre-computed aggregated stats directly from Firestore summary documents.
 * Guarantees zero raw document scans or real-time calculations.
 */
export class SummaryDocumentProvider implements AnalyticsProvider {
  private getCollectionPath() {
    return "analytics_summaries";
  }

  public async getDashboardMetrics(projectId?: string, _username?: string): Promise<DashboardMetrics> {
    if (!projectId) {
      throw new AnalyticsError("PROJECT_SCOPE_REQUIRED", "Project ID is required for summary documents.");
    }

    try {
      const docRef = doc(db, this.getCollectionPath(), `${projectId}_dashboard`);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        throw new AnalyticsError("SUMMARY_NOT_FOUND", `Dashboard summary for project ${projectId} not found.`);
      }

      return snap.data() as DashboardMetrics;
    } catch (err: unknown) {
      if (err instanceof AnalyticsError) throw err;
      const errMsg = err instanceof Error ? err.message : "Summary provider request failed.";
      throw new AnalyticsError("PROVIDER_UNAVAILABLE", errMsg);
    }
  }

  public async getActivityMetrics(projectId?: string, username?: string): Promise<ActivityMetrics> {
    if (!projectId || !username) {
      throw new AnalyticsError("PROJECT_SCOPE_REQUIRED", "Project ID and username are required for summary documents.");
    }

    try {
      const docRef = doc(db, this.getCollectionPath(), `${projectId}_activity_${username}`);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        throw new AnalyticsError("SUMMARY_NOT_FOUND", `Activity summary for user ${username} not found.`);
      }

      return snap.data() as ActivityMetrics;
    } catch (err: unknown) {
      if (err instanceof AnalyticsError) throw err;
      const errMsg = err instanceof Error ? err.message : "Summary provider request failed.";
      throw new AnalyticsError("PROVIDER_UNAVAILABLE", errMsg);
    }
  }

  public async getPipelineMetrics(projectId?: string): Promise<LeadPipelineMetrics> {
    if (!projectId) {
      throw new AnalyticsError("PROJECT_SCOPE_REQUIRED", "Project ID is required.");
    }

    try {
      const docRef = doc(db, this.getCollectionPath(), `${projectId}_pipeline`);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        throw new AnalyticsError("SUMMARY_NOT_FOUND", `Pipeline summary for project ${projectId} not found.`);
      }

      return snap.data() as LeadPipelineMetrics;
    } catch (err: unknown) {
      if (err instanceof AnalyticsError) throw err;
      const errMsg = err instanceof Error ? err.message : "Summary provider request failed.";
      throw new AnalyticsError("PROVIDER_UNAVAILABLE", errMsg);
    }
  }

  public async getBookingMetrics(projectId?: string): Promise<BookingMetrics> {
    if (!projectId) {
      throw new AnalyticsError("PROJECT_SCOPE_REQUIRED", "Project ID is required.");
    }

    try {
      const docRef = doc(db, this.getCollectionPath(), `${projectId}_bookings`);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        throw new AnalyticsError("SUMMARY_NOT_FOUND", `Booking summary for project ${projectId} not found.`);
      }

      return snap.data() as BookingMetrics;
    } catch (err: unknown) {
      if (err instanceof AnalyticsError) throw err;
      const errMsg = err instanceof Error ? err.message : "Summary provider request failed.";
      throw new AnalyticsError("PROVIDER_UNAVAILABLE", errMsg);
    }
  }

  public async getTeamMetrics(projectId?: string): Promise<TeamMetrics> {
    try {
      const targetId = projectId || "global";
      const docRef = doc(db, this.getCollectionPath(), `${targetId}_team`);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        throw new AnalyticsError("SUMMARY_NOT_FOUND", `Team metrics summary not found.`);
      }

      return snap.data() as TeamMetrics;
    } catch (err: unknown) {
      if (err instanceof AnalyticsError) throw err;
      const errMsg = err instanceof Error ? err.message : "Summary provider request failed.";
      throw new AnalyticsError("PROVIDER_UNAVAILABLE", errMsg);
    }
  }
}
