// src/shared/services/reporting/forecasting/contracts/ForecastMetric.ts
export interface ForecastMetric {
  readonly name: string;
  readonly historicalValue: number;
  readonly predictedValue: number;
  readonly confidence: number;
  readonly trend: "up" | "down" | "stable";
}
