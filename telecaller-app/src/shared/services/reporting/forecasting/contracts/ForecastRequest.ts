// src/shared/services/reporting/forecasting/contracts/ForecastRequest.ts
import { MetricSeries } from "./MetricSeries";
import { ForecastPeriod } from "./ForecastPeriod";

export interface ForecastRequest {
  readonly series: readonly MetricSeries[];
  readonly period: ForecastPeriod;
  readonly horizon: number;
  readonly configuration?: Record<string, any>;
}
