// src/shared/services/reporting/forecasting/strategies/LinearTrendForecastStrategy.ts
import { ForecastStrategy, ForecastStrategyMetadata } from "../contracts/ForecastStrategy";
import { ForecastRequest } from "../contracts/ForecastRequest";
import { ForecastResult } from "../contracts/ForecastResult";
import { ForecastMetric } from "../contracts/ForecastMetric";
import { ForecastValidationError } from "../ForecastErrors";

export class LinearTrendForecastStrategy implements ForecastStrategy {
  public readonly metadata: ForecastStrategyMetadata = {
    name: "Linear Trend Forecast Strategy",
    description: "Fits a least-squares linear regression model (y = mx + b) and extrapolates future values.",
    version: "1.0.0",
    deterministic: true,
    supportsConfidence: true,
    supportsMultiStepForecast: true,
  };

  public async forecast(request: ForecastRequest): Promise<ForecastResult> {
    const minObs = request.configuration?.minimumObservations ?? 3;
    if (minObs < 2) {
      throw new ForecastValidationError("[LinearTrend] minimumObservations must be at least 2.");
    }

    const start = performance.now();
    const forecastMetrics: ForecastMetric[] = [];

    for (const series of request.series) {
      const validObs = series.observations.filter((o) => o.value !== null) as { timestamp: string; value: number }[];
      
      if (validObs.length < minObs) {
        throw new ForecastValidationError(
          `[LinearTrend] Series ${series.metricName} has insufficient observations: got ${validObs.length}, min required: ${minObs}.`
        );
      }

      const N = validObs.length;
      const lastHistoricalValue = validObs[N - 1].value;

      // Fit regression line y = mx + b using index as x
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;

      for (let i = 0; i < N; i++) {
        const x = i;
        const y = validObs[i].value;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      }

      const denominator = N * sumXX - sumX * sumX;
      const m = denominator !== 0 ? (N * sumXY - sumX * sumY) / denominator : 0;
      const b = denominator !== 0 ? (sumY - m * sumX) / N : sumY / N;

      // Extrapolate value at horizon
      // Horizon index is (N - 1) + horizon
      const horizonIndex = N - 1 + request.horizon;
      const predictedValue = m * horizonIndex + b;

      // Calculate confidence (R^2 Coefficient of Determination)
      const meanY = sumY / N;
      let ssTot = 0;
      let ssRes = 0;

      for (let i = 0; i < N; i++) {
        const x = i;
        const y = validObs[i].value;
        const f = m * x + b;
        ssTot += Math.pow(y - meanY, 2);
        ssRes += Math.pow(y - f, 2);
      }

      let r2 = 1.0;
      if (ssTot !== 0) {
        r2 = 1 - ssRes / ssTot;
      }

      const confidence = Math.max(0, Math.min(1, r2));

      // Trend direction
      let trend: "up" | "down" | "stable" = "stable";
      if (m > 0.0001) {
        trend = "up";
      } else if (m < -0.0001) {
        trend = "down";
      }

      forecastMetrics.push({
        name: series.metricName,
        historicalValue: lastHistoricalValue,
        predictedValue,
        confidence,
        trend,
      });
    }

    return Object.freeze({
      generatedAt: new Date().toISOString(),
      strategy: this.metadata.name,
      strategyVersion: this.metadata.version,
      generatedBy: "ForecastEngine",
      executionDurationMs: performance.now() - start,
      period: request.period,
      metrics: Object.freeze(forecastMetrics),
    });
  }
}
