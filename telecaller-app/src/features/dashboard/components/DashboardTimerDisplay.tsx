import { formatDuration } from "@/shared/utils/dateUtils";
import { useDashboardTimerContext } from "@/features/dashboard/context/DashboardTimerContext";

/** Renders formatted shift duration; subscribes to the isolated 1Hz timer context. */
export function DashboardShiftDuration() {
  const { elapsedWorkSeconds } = useDashboardTimerContext();
  return <>{formatDuration(elapsedWorkSeconds * 1000)}</>;
}

/** Renders formatted break duration; subscribes to the isolated 1Hz timer context. */
export function DashboardBreakDuration() {
  const { elapsedBreakSeconds } = useDashboardTimerContext();
  return <>{formatDuration(elapsedBreakSeconds * 1000)}</>;
}
