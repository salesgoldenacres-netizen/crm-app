import React, { createContext, useContext, useEffect, useMemo } from "react";
import { AnalyticsService } from "./AnalyticsService";
import { ClientAnalyticsProvider } from "./ClientAnalyticsProvider";
import { SummaryDocumentProvider } from "./SummaryDocumentProvider";
import { FirestoreAggregationProvider } from "./FirestoreAggregationProvider";
import { useLeadsStore } from "@/features/leads/hooks/useLeadsStore";
import { useUsersStore } from "@/features/employees/hooks/useUsersStore";
import { useCallTargetStore, useGoalsStore } from "@/features/admin/hooks/adminStores";
import { useProjectScope } from "../ProjectScopeContext";
import { useAuthorization } from "../AuthorizationContext";
import { useAuth } from "@/features/auth/hooks/useAuth";

const AnalyticsContext = createContext<AnalyticsService | null>(null);

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * AnalyticsProvider (Wave 8 Phase 2C)
 * React context wrapper that instantiates providers and wraps AnalyticsService.
 * Automatically invalidates caches on user session transitions and project scope updates.
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const { user } = useAuth();
  const { activeProjectId } = useProjectScope();
  const authContext = useAuthorization();

  // Getters for store arrays to pass to ClientAnalyticsProvider
  const leadsStore = useLeadsStore();
  const usersStore = useUsersStore();
  const targetsStore = useCallTargetStore();
  const goalsStore = useGoalsStore();

  const getLeads = () => leadsStore.leads;
  const getUsers = () => usersStore.users;
  const getTargets = () => targetsStore.targets;
  const getGoals = () => goalsStore.goals;

  const analyticsService = useMemo(() => {
    const client = new ClientAnalyticsProvider(getLeads, getUsers, getTargets, getGoals);
    const summary = new SummaryDocumentProvider();
    const aggregation = new FirestoreAggregationProvider();

    // Check permission utilizing AuthorizationContext canViewAnalytics
    const checkPermission = (u: any, capability: string, _projId?: string) => {
      if (capability === "view-analytics") {
        return authContext.canViewAnalytics();
      }
      return true;
    };

    return new AnalyticsService(
      client,
      summary,
      aggregation,
      () => activeProjectId,
      () => user,
      checkPermission
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeProjectId, authContext]);

  // Invalidate cache reactively on scope/user updates
  useEffect(() => {
    analyticsService.invalidateCache();
  }, [user?.id, activeProjectId, analyticsService]);

  return (
    <AnalyticsContext.Provider value={analyticsService}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
}
