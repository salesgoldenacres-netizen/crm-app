// src/shared/services/reporting/forecasting/contracts/ForecastResult.ts
import { ForecastPeriod } from "./ForecastPeriod";
import { ForecastMetric } from "./ForecastMetric";

export interface ForecastResult {
  readonly generatedAt: string;
  readonly strategy: string;
  readonly strategyVersion: string;
  readonly generatedBy: string;
  readonly executionDurationMs: number;
  readonly period: ForecastPeriod;
  readonly metrics: readonly ForecastMetric[];
}
