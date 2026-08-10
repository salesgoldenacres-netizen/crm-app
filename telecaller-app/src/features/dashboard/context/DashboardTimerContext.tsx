import React, { createContext, useContext, useMemo } from "react";

export interface DashboardTimerContextValue {
  elapsedWorkSeconds: number;
  elapsedBreakSeconds: number;
}

const DashboardTimerContext = createContext<DashboardTimerContextValue | null>(null);

interface DashboardTimerProviderProps {
  elapsedWorkSeconds: number;
  elapsedBreakSeconds: number;
  children: React.ReactNode;
}

export function DashboardTimerProvider({
  elapsedWorkSeconds,
  elapsedBreakSeconds,
  children,
}: DashboardTimerProviderProps) {
  const value = useMemo(
    () => ({ elapsedWorkSeconds, elapsedBreakSeconds }),
    [elapsedWorkSeconds, elapsedBreakSeconds]
  );

  return (
    <DashboardTimerContext.Provider value={value}>{children}</DashboardTimerContext.Provider>
  );
}

/** Shift/break timer values — only re-renders consumers when the 1Hz tick updates. */
export function useDashboardTimerContext(): DashboardTimerContextValue {
  const ctx = useContext(DashboardTimerContext);
  if (!ctx) {
    throw new Error("useDashboardTimerContext must be used within DashboardTimerProvider");
  }
  return ctx;
}

export default DashboardTimerContext;
