import { ReactNode } from "react";
import { AttendanceRecord } from "@/shared/types";
import { useDashboardTimers } from "@/features/dashboard/hooks/useDashboardTimers";
import { DashboardTimerProvider } from "@/features/dashboard/context/DashboardTimerContext";

interface DashboardTimerHostProps {
  todayAttendance: AttendanceRecord | null | undefined;
  children: ReactNode;
}

/**
 * DashboardTimerHost (H-1 / P-5)
 *
 * Owns shift/break timer state (1Hz) so ticking does not re-render Dashboard.tsx
 * or DashboardContext subscribers. Only components that call
 * `useDashboardTimerContext()` re-render on each tick.
 */
export default function DashboardTimerHost({
  todayAttendance,
  children,
}: DashboardTimerHostProps) {
  const { elapsedWorkSeconds, elapsedBreakSeconds } = useDashboardTimers(todayAttendance);

  return (
    <DashboardTimerProvider
      elapsedWorkSeconds={elapsedWorkSeconds}
      elapsedBreakSeconds={elapsedBreakSeconds}
    >
      {children}
    </DashboardTimerProvider>
  );
}
