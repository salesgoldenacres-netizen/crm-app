// src/shared/services/reporting/dataset/DatasetErrors.ts
export class DatasetError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DatasetError";
  }
}

export class DatasetValidationError extends DatasetError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DatasetValidationError";
  }
}

export class ProviderNotFoundError extends DatasetError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ProviderNotFoundError";
  }
}

export class CalculationError extends DatasetError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CalculationError";
  }
}
