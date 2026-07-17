// src/shared/services/reporting/forecasting/ForecastService.ts
import { ForecastRequest } from "./contracts/ForecastRequest";
import { ForecastResult } from "./contracts/ForecastResult";
import { ForecastStrategyRegistry, forecastStrategyRegistry } from "./ForecastStrategyRegistry";
import { ForecastEngine } from "./ForecastEngine";
import { MetricSeriesExtractor } from "./MetricSeriesExtractor";
import { Report } from "../contracts/Report";
import { ForecastPeriod } from "./contracts/ForecastPeriod";

export class ForecastService {
  private readonly engine: ForecastEngine;
  private readonly extractor: MetricSeriesExtractor;

  constructor(
    private readonly registry: ForecastStrategyRegistry = forecastStrategyRegistry
  ) {
    this.engine = new ForecastEngine(this.registry);
    this.extractor = new MetricSeriesExtractor();
  }

  public async forecastReport(
    report: Report<any>,
    strategyName: string,
    period: ForecastPeriod,
    horizon: number,
    configuration?: Record<string, any>,
    generatedBy?: string
  ): Promise<ForecastResult> {
    const series = this.extractor.extract(report);
    const request: ForecastRequest = {
      series,
      period,
      horizon,
      configuration,
    };
    return this.engine.executeForecast(strategyName, request, generatedBy);
  }

  public getRegistry(): ForecastStrategyRegistry {
    return this.registry;
  }
}

const defaultService = new ForecastService();
export default defaultService;
export { defaultService as forecastService };
