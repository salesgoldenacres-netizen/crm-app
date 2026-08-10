import {
  DashboardMetrics,
  ActivityMetrics,
  LeadPipelineMetrics,
  BookingMetrics,
  TeamMetrics,
} from "./analyticsTypes";

export interface AnalyticsProvider {
  getDashboardMetrics(projectId?: string, username?: string): Promise<DashboardMetrics>;
  getActivityMetrics(projectId?: string, username?: string): Promise<ActivityMetrics>;
  getPipelineMetrics(projectId?: string): Promise<LeadPipelineMetrics>;
  getBookingMetrics(projectId?: string): Promise<BookingMetrics>;
  getTeamMetrics(projectId?: string): Promise<TeamMetrics>;
}

/** Options for targeted analytics cache invalidation. */
export interface InvalidateCacheOptions {
  /** Only invalidate these metric types. Omit to invalidate all metric types. */
  metrics?: MetricType[];
  /** Only invalidate entries for this project. Omit to invalidate across all projects. */
  projectId?: string;
}

export interface AnalyticsService extends AnalyticsProvider {
  invalidateCache(options?: InvalidateCacheOptions): void;
}
export type MetricType = "dashboard" | "activity" | "pipeline" | "booking" | "team";
export type CacheClass = "realtime" | "summary" | "count";
