/**
 * Performance Budgets (Wave 8 Phase 2D)
 * Executable thresholds — PerformanceMonitor evaluates PASS / WARNING / FAIL.
 */

export interface PerformanceBudget {
  maxDomRows: number;
  maxQueryTimeMs: number;
  maxVisibleMemoryMB: number;
  maxDroppedFramesPct: number;
  maxBundleIncreasePct: number;
  minScrollFps: number;
  maxPageSize: number;
  minSearchLength: number;
}

export type BudgetResult = "PASS" | "WARNING" | "FAIL";

export interface BudgetEvaluation {
  metric: string;
  value: number;
  budget: number;
  result: BudgetResult;
}

export const DESKTOP_BUDGETS: PerformanceBudget = {
  maxDomRows: 60,
  maxQueryTimeMs: 300,
  maxVisibleMemoryMB: 40,
  maxDroppedFramesPct: 5,
  maxBundleIncreasePct: 5,
  minScrollFps: 55,
  maxPageSize: 50,
  minSearchLength: 3,
};

export const MOBILE_BUDGETS: PerformanceBudget = {
  maxDomRows: 15,
  maxQueryTimeMs: 300,
  maxVisibleMemoryMB: 25,
  maxDroppedFramesPct: 10,
  maxBundleIncreasePct: 5,
  minScrollFps: 50,
  maxPageSize: 50,
  minSearchLength: 3,
};

export function evaluateBudget(
  metric: string,
  value: number,
  budget: number,
  lowerIsBetter = true
): BudgetEvaluation {
  const withinBudget = lowerIsBetter ? value <= budget : value >= budget;
  const warningThreshold = lowerIsBetter ? budget * 1.2 : budget * 0.8;
  const atWarning = lowerIsBetter ? value <= warningThreshold : value >= warningThreshold;

  return {
    metric,
    value,
    budget,
    result: withinBudget ? "PASS" : atWarning ? "WARNING" : "FAIL",
  };
}
