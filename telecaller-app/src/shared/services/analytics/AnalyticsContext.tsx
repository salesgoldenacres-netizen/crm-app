import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { AnalyticsService } from "./AnalyticsService";
import { ClientAnalyticsProvider } from "./ClientAnalyticsProvider";
import { SummaryDocumentProvider } from "./SummaryDocumentProvider";
import { CallableAggregationProvider } from "./CallableAggregationProvider";
import { useProjectScope } from "../ProjectScopeContext";
import { useAuthorization } from "../AuthorizationContext";
import type { User, Lead } from "@/shared/types";

export interface AnalyticsGoalRow {
  target: number;
  achieved: number;
  label: string;
}

export interface AnalyticsProviderProps {
  children: React.ReactNode;
  user: User | null;
  getLeads: () => Lead[];
  getUsers: () => User[];
  getTargets: () => Record<string, { targetCount?: number; bookingTargetCount?: number }>;
  getGoals: () => AnalyticsGoalRow[];
}

/** Shape exposed to consumers via useAnalytics(). */
export interface AnalyticsContextValue {
  /** The underlying service — use for metrics calls only. */
  service: AnalyticsService;
  /**
   * Monotonically increasing integer. Increments after every call to
   * `refreshDashboard()`. Consumers (e.g. WidgetGrid) watch this value to
   * know when to re-fetch dashboard + team metrics.
   */
  refreshToken: number;
  /**
   * Invalidates the dashboard + team analytics cache for the current project
   * and signals consumers by incrementing `refreshToken`.
   * Call this after any successful mutation that affects dashboard numbers
   * (call logged, booking created, lead status changed).
   */
  refreshDashboard: () => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

/**
 * AnalyticsProvider (Wave 8 Phase 2C)
 * React context wrapper that instantiates providers and wraps AnalyticsService.
 * Data sources are injected at the composition root (see FeatureAnalyticsProvider).
 */
export function AnalyticsProvider({
  children,
  user,
  getLeads,
  getUsers,
  getTargets,
  getGoals,
}: AnalyticsProviderProps) {
  const { activeProjectId } = useProjectScope();
  const authContext = useAuthorization();
  const analyticsService = useMemo(() => {
    const isManager = authContext.canManageUsers();
    const client = new ClientAnalyticsProvider(getLeads, getUsers, getTargets, getGoals, isManager);
    const summary = new SummaryDocumentProvider();
    const aggregation = new CallableAggregationProvider();

    const checkPermission = (_user: unknown, capability: string, _projId?: string) => {
      if (capability === "view-analytics") {
        return authContext.canViewAnalytics();
      }
      return true;
    };

    return new AnalyticsService(
      client,
      summary,
      aggregation,
      () => activeProjectId ?? undefined,
      () => user,
      checkPermission
    );
  }, [user, activeProjectId, authContext, getLeads, getUsers, getTargets, getGoals]);

  useEffect(() => {
    analyticsService.invalidateCache();
  }, [user?.id, activeProjectId, analyticsService]);

  const [refreshToken, setRefreshToken] = useState(0);

  /**
   * Targeted invalidation + refresh signal.
   * Evicts only dashboard + team cache entries for the current active project
   * (other metric types like pipeline/booking are left intact).
   * Increments refreshToken, which WidgetGrid watches to re-fetch.
   */
  const refreshDashboard = useCallback(() => {
    analyticsService.invalidateCache({
      metrics: ["dashboard", "team"],
      projectId: activeProjectId ?? undefined,
    });
    setRefreshToken((prev) => prev + 1);
  }, [analyticsService, activeProjectId]);

  const contextValue = useMemo<AnalyticsContextValue>(
    () => ({ service: analyticsService, refreshToken, refreshDashboard }),
    [analyticsService, refreshToken, refreshDashboard]
  );

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
}

/**
 * Returns the analytics context value.
 * Use `ctx.service` for metric calls and `ctx.refreshDashboard()` after mutations.
 */
export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
}
