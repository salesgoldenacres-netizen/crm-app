import { AnalyticsProvider, AnalyticsService as IAnalyticsService, MetricType, CacheClass } from "./analyticsContracts";
import { AnalyticsError } from "./analyticsErrors";
import {
  DashboardMetrics,
  ActivityMetrics,
  LeadPipelineMetrics,
  BookingMetrics,
  TeamMetrics,
} from "./analyticsTypes";
import { User } from "@/shared/types";

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number; // in milliseconds
}

/**
 * AnalyticsService (Wave 8 Phase 2C)
 * Central orchestrator for all CRM KPI metrics.
 * Features:
 * - Four-tier provider routing (Client -> Summary -> Aggregation)
 * - Request deduplication (collapses identical concurrent executions)
 * - Classification-based caching (Realtime, Summary, Count TTLs)
 * - Scope & authorization enforcement (project-isolated boundaries)
 */
export class AnalyticsService implements IAnalyticsService {
  private providers: {
    client: AnalyticsProvider;
    summary: AnalyticsProvider;
    aggregation: AnalyticsProvider;
  };
  private cache = new Map<string, CacheEntry>();
  private activePromises = new Map<string, Promise<unknown>>();
  
  // Scoping context dependencies
  private getActiveProjectId: () => string | undefined;
  private getUser: () => User | null;
  private checkPermission: (user: User | null, capability: string, projectId?: string) => boolean;

  constructor(
    clientProvider: AnalyticsProvider,
    summaryProvider: AnalyticsProvider,
    aggregationProvider: AnalyticsProvider,
    getActiveProjectId: () => string | undefined,
    getUser: () => User | null,
    checkPermission: (user: User | null, capability: string, projectId?: string) => boolean
  ) {
    this.providers = {
      client: clientProvider,
      summary: summaryProvider,
      aggregation: aggregationProvider,
    };
    this.getActiveProjectId = getActiveProjectId;
    this.getUser = getUser;
    this.checkPermission = checkPermission;
  }

  /** Cache Invalidation */
  public invalidateCache(): void {
    this.cache.clear();
    this.activePromises.clear();
  }

  /** Gets active project scoping, defaults to context value if not passed */
  private resolveProjectId(projectId?: string): string | undefined {
    return projectId || this.getActiveProjectId();
  }

  /** Formulates key combining scope, auth scope, metric, and filters */
  private getCacheKey(metric: MetricType, projectId?: string, extraParams?: string): string {
    const user = this.getUser();
    const userId = user?.id || "anonymous";
    const userRole = user?.role || "none";
    return `${userId}:${userRole}:${projectId || "global"}:${metric}:${extraParams || ""}`;
  }

  /** Determines CacheClass and TTL by metric type */
  private getCacheConfig(metric: MetricType): { cacheClass: CacheClass; ttlMs: number } {
    switch (metric) {
      case "dashboard":
      case "activity":
        return { cacheClass: "realtime", ttlMs: 15 * 1000 }; // 15 seconds
      case "team":
        return { cacheClass: "summary", ttlMs: 5 * 60 * 1000 }; // 5 minutes
      case "pipeline":
      case "booking":
        return { cacheClass: "count", ttlMs: 30 * 1000 }; // 30 seconds
    }
  }

  /** Verifies project authorization boundary before proceeding */
  private verifyAccess(projectId?: string, capability = "view-analytics") {
    const user = this.getUser();
    if (!user) {
      throw new AnalyticsError("PERMISSION_DENIED", "Authentication required for analytics.");
    }
    const isAllowed = this.checkPermission(user, capability, projectId);
    if (!isAllowed) {
      throw new AnalyticsError("PERMISSION_DENIED", "Access to requested analytics scope is unauthorized.");
    }
  }

  /** Execution helper wrapping caching, deduplication, and tier routing */
  private async executeWithRouting<T>(
    metric: MetricType,
    projectId: string | undefined,
    username: string | undefined,
    runCall: (provider: AnalyticsProvider) => Promise<T>
  ): Promise<T> {
    this.verifyAccess(projectId);

    const cacheKey = this.getCacheKey(metric, projectId, username);
    const { ttlMs } = this.getCacheConfig(metric);

    // 1. Check Cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }

    // 2. Check Deduplication
    const activePromise = this.activePromises.get(cacheKey);
    if (activePromise) {
      return activePromise as Promise<T>;
    }

    // 3. Orchestrate Routing (Client -> Summary -> Aggregation)
    const orchestrate = async (): Promise<T> => {
      // Tier 1: Client store compute
      try {
        const res = await runCall(this.providers.client);
        return res;
      } catch {
        // Tier 2 & 3: Server summary document
        try {
          const res = await runCall(this.providers.summary);
          return res;
        } catch {
          // Tier 4: Server count query
          try {
            const res = await runCall(this.providers.aggregation);
            return res;
          } catch (aggregationErr: unknown) {
            const errMsg = aggregationErr instanceof Error ? aggregationErr.message : "All analytics providers failed.";
            throw new AnalyticsError(
              "PROVIDER_UNAVAILABLE",
              `All analytics providers failed. Aggregation error: ${errMsg}`
            );
          }
        }
      }
    };

    const promise = orchestrate().then((data) => {
      // Set Cache
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
      });
      this.activePromises.delete(cacheKey);
      return data;
    }).catch((err) => {
      this.activePromises.delete(cacheKey);
      throw err;
    });

    this.activePromises.set(cacheKey, promise);
    return promise;
  }

  public async getDashboardMetrics(projectId?: string, username?: string): Promise<DashboardMetrics> {
    const resolvedProjectId = this.resolveProjectId(projectId);
    const user = this.getUser();
    const activeUsername = username || user?.username;

    return this.executeWithRouting<DashboardMetrics>(
      "dashboard",
      resolvedProjectId,
      activeUsername,
      (p) => p.getDashboardMetrics(resolvedProjectId, activeUsername)
    );
  }

  public async getActivityMetrics(projectId?: string, username?: string): Promise<ActivityMetrics> {
    const resolvedProjectId = this.resolveProjectId(projectId);
    const user = this.getUser();
    const activeUsername = username || user?.username;

    return this.executeWithRouting<ActivityMetrics>(
      "activity",
      resolvedProjectId,
      activeUsername,
      (p) => p.getActivityMetrics(resolvedProjectId, activeUsername)
    );
  }

  public async getPipelineMetrics(projectId?: string): Promise<LeadPipelineMetrics> {
    const resolvedProjectId = this.resolveProjectId(projectId);
    return this.executeWithRouting<LeadPipelineMetrics>(
      "pipeline",
      resolvedProjectId,
      undefined,
      (p) => p.getPipelineMetrics(resolvedProjectId)
    );
  }

  public async getBookingMetrics(projectId?: string): Promise<BookingMetrics> {
    const resolvedProjectId = this.resolveProjectId(projectId);
    return this.executeWithRouting<BookingMetrics>(
      "booking",
      resolvedProjectId,
      undefined,
      (p) => p.getBookingMetrics(resolvedProjectId)
    );
  }

  public async getTeamMetrics(projectId?: string): Promise<TeamMetrics> {
    const resolvedProjectId = this.resolveProjectId(projectId);
    return this.executeWithRouting<TeamMetrics>(
      "team",
      resolvedProjectId,
      undefined,
      (p) => p.getTeamMetrics(resolvedProjectId)
    );
  }
}
