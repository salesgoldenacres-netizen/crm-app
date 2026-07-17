// src/shared/services/reporting/history/contracts/ExecutionMetrics.ts
export interface ExecutionMetrics {
  readonly totalDurationMs: number;
  readonly executionDurationMs: number;
  readonly exportDurationMs?: number;
  readonly deliveryDurationMs?: number;
}
