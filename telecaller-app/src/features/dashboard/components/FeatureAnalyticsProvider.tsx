import { useCallback } from "react";
import { useAgentOpenLeads } from "@/features/leads/hooks/useAgentOpenLeads";
import { useUsersStore } from "@/features/employees/hooks/useUsersStore";
import { useCallTargetStore, useGoalsStore } from "@/features/admin/hooks/adminStores";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  AnalyticsProvider,
  type AnalyticsProviderProps,
} from "@/shared/services/analytics/AnalyticsContext";

type FeatureAnalyticsProviderProps = Pick<AnalyticsProviderProps, "children">;

/**
 * Composition-root bridge: wires feature hooks into shared AnalyticsProvider.
 * Lives in features/ so shared/ never imports @/features/* (audit A-1).
 */
export function FeatureAnalyticsProvider({ children }: FeatureAnalyticsProviderProps) {
  const { user } = useAuth();
  const { openLeads } = useAgentOpenLeads();
  const usersStore = useUsersStore();
  const targetsStore = useCallTargetStore();
  const goalsStore = useGoalsStore();

  const getLeads = useCallback(() => openLeads, [openLeads]);
  const getUsers = useCallback(() => usersStore.users, [usersStore.users]);
  const getTargets = useCallback(() => targetsStore.targets, [targetsStore.targets]);
  const getGoals = useCallback(() => {
    const g = goalsStore.goals;
    return [
      { target: g.monthlyCallGoal, achieved: 0, label: "Monthly Calls" },
      { target: g.monthlyBookingGoal, achieved: 0, label: "Monthly Bookings" },
      { target: g.targetRevenue, achieved: 0, label: g.customGoalText || "Revenue" },
    ];
  }, [goalsStore.goals]);

  return (
    <AnalyticsProvider
      user={user}
      getLeads={getLeads}
      getUsers={getUsers}
      getTargets={getTargets}
      getGoals={getGoals}
    >
      {children}
    </AnalyticsProvider>
  );
}
