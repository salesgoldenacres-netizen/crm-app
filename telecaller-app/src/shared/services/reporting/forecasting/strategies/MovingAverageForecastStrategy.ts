// src/shared/services/reporting/forecasting/strategies/MovingAverageForecastStrategy.ts
import { ForecastStrategy, ForecastStrategyMetadata } from "../contracts/ForecastStrategy";
import { ForecastRequest } from "../contracts/ForecastRequest";
import { ForecastResult } from "../contracts/ForecastResult";
import { ForecastMetric } from "../contracts/ForecastMetric";
import { ForecastValidationError, ForecastCalculationError } from "../ForecastErrors";

export class MovingAverageForecastStrategy implements ForecastStrategy {
  public readonly metadata: ForecastStrategyMetadata = {
    name: "Moving Average Forecast Strategy",
    description: "Predicts future metric values using a configurable rolling window arithmetic mean.",
    version: "1.0.0",
    deterministic: true,
    supportsConfidence: true,
    supportsMultiStepForecast: true,
  };

  public async forecast(request: ForecastRequest): Promise<ForecastResult> {
    const windowSize = request.configuration?.windowSize ?? 3;
    const minObs = request.configuration?.minimumObservations ?? 3;

    if (windowSize <= 0) {
      throw new ForecastValidationError("[MovingAverage] windowSize must be greater than 0.");
    }
    if (minObs <= 0) {
      throw new ForecastValidationError("[MovingAverage] minimumObservations must be greater than 0.");
    }

    const start = performance.now();
    const forecastMetrics: ForecastMetric[] = [];

    for (const series of request.series) {
      const validObs = series.observations.filter((o) => o.value !== null) as { timestamp: string; value: number }[];
      
      if (validObs.length < minObs) {
        throw new ForecastValidationError(
          `[MovingAverage] Series ${series.metricName} has insufficient observations: got ${validObs.length}, min required: ${minObs}.`
        );
      }

      // Extract last historical value
      const lastHistoricalValue = validObs[validObs.length - 1].value;

      // Recursive multi-step forecasting for the given horizon
      const history = validObs.map((o) => o.value);
      let predictedValue = 0;

      for (let h = 0; h < request.horizon; h++) {
        const slice = history.slice(-windowSize);
        if (slice.length === 0) {
          throw new ForecastCalculationError(`[MovingAverage] Empty window encountered during calculation.`);
        }
        const mean = slice.reduce((sum, val) => sum + val, 0) / slice.length;
        predictedValue = mean;
        history.push(mean); // Append prediction for recursive forecasting
      }

      // Calculate confidence using coefficient of variation (CV = stdDev / mean) over the window of original observations
      const originalWindow = validObs.slice(-windowSize).map((o) => o.value);
      const originalMean = originalWindow.reduce((sum, val) => sum + val, 0) / originalWindow.length;
      let confidence = 1.0;

      if (originalWindow.length > 1 && originalMean !== 0) {
        const variance = originalWindow.reduce((sum, val) => sum + Math.pow(val - originalMean, 2), 0) / originalWindow.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / Math.abs(originalMean);
        confidence = Math.max(0, Math.min(1, 1 - cv));
      }

      // Trend direction
      let trend: "up" | "down" | "stable" = "stable";
      if (predictedValue > lastHistoricalValue) {
        trend = "up";
      } else if (predictedValue < lastHistoricalValue) {
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
