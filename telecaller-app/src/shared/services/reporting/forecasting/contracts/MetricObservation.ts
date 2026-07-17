// src/shared/services/reporting/forecasting/contracts/MetricObservation.ts
export interface MetricObservation {
  readonly timestamp: string;
  readonly value: number | null;
}
