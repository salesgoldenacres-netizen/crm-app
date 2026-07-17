// src/shared/services/reporting/forecasting/ForecastErrors.ts
export class ForecastError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ForecastError";
  }
}

export class ForecastValidationError extends ForecastError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ForecastValidationError";
  }
}

export class ForecastStrategyNotFoundError extends ForecastError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ForecastStrategyNotFoundError";
  }
}

export class ForecastCalculationError extends ForecastError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ForecastCalculationError";
  }
}
