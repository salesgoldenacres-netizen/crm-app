// src/shared/services/reporting/forecasting/ForecastEngine.ts
import { ForecastRequest } from "./contracts/ForecastRequest";
import { ForecastResult } from "./contracts/ForecastResult";
import { ForecastStrategyRegistry } from "./ForecastStrategyRegistry";
import { ForecastValidationError, ForecastCalculationError } from "./ForecastErrors";

export class ForecastEngine {
  constructor(private readonly registry: ForecastStrategyRegistry) {}

  public async executeForecast(
    strategyName: string,
    request: ForecastRequest,
    generatedBy: string = "system"
  ): Promise<ForecastResult> {
    if (!strategyName) {
      throw new ForecastValidationError("[ForecastEngine] Strategy name must be specified.");
    }
    if (!request) {
      throw new ForecastValidationError("[ForecastEngine] Forecast request must be specified.");
    }
    if (request.horizon <= 0) {
      throw new ForecastValidationError("[ForecastEngine] Forecast horizon must be greater than 0.");
    }
    if (!request.series || request.series.length === 0) {
      throw new ForecastValidationError("[ForecastEngine] Forecast request series must contain at least one MetricSeries.");
    }

    const strategy = this.registry.getStrategy(strategyName);

    const start = performance.now();
    try {
      const rawResult = await strategy.forecast(request);
      const executionDurationMs = performance.now() - start;

      return Object.freeze({
        ...rawResult,
        generatedBy,
        executionDurationMs,
      });
    } catch (err: any) {
      if (err instanceof ForecastValidationError || err instanceof ForecastCalculationError) {
        throw err;
      }
      throw new ForecastCalculationError(`[ForecastEngine] Calculation failed: ${err.message}`, { cause: err });
    }
  }
}
