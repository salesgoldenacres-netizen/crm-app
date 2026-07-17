// src/shared/services/reporting/forecasting/contracts/ForecastStrategy.ts
import { ForecastRequest } from "./ForecastRequest";
import { ForecastResult } from "./ForecastResult";

export interface ForecastStrategyMetadata {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly deterministic: boolean;
  readonly supportsConfidence: boolean;
  readonly supportsMultiStepForecast: boolean;
}

export interface ForecastStrategy {
  readonly metadata: ForecastStrategyMetadata;
  forecast(request: ForecastRequest): Promise<ForecastResult>;
}
