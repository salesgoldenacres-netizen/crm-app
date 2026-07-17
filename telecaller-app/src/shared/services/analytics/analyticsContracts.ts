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

export interface AnalyticsService extends AnalyticsProvider {
  invalidateCache(): void;
}
export type MetricType = "dashboard" | "activity" | "pipeline" | "booking" | "team";
export type CacheClass = "realtime" | "summary" | "count";
