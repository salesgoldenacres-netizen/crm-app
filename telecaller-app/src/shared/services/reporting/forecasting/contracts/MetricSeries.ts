// src/shared/services/reporting/forecasting/contracts/MetricSeries.ts
import { MetricObservation } from "./MetricObservation";

export interface MetricSeries {
  readonly metricName: string;
  readonly unit: string;
  readonly source: string;
  readonly observations: readonly MetricObservation[];
}
