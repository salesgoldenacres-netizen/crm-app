// src/shared/services/reporting/delivery/DeliveryErrors.ts
export class DeliveryError extends Error {
  public readonly cause?: Error;
  constructor(message: string, options?: { cause?: Error }) {
    super(message);
    this.name = this.constructor.name;
    this.cause = options?.cause;
  }
}

export class DeliveryProviderNotFoundError extends DeliveryError {}
export class DeliveryValidationError extends DeliveryError {}
export class DeliveryProviderExecutionError extends DeliveryError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, options);
    this.name = "DeliveryProviderExecutionError";
  }
}
export class NotImplementedDeliveryProviderError extends DeliveryError {}
export class DuplicateDeliveryProviderError extends DeliveryError {}
