// src/shared/services/reporting/delivery/contracts/DeliveryContext.ts
export interface DeliveryContext {
  readonly requestedBy?: string;
  readonly correlationId?: string;
  readonly tags?: readonly string[];
}
