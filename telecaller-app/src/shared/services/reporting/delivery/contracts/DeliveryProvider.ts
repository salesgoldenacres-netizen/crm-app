// src/shared/services/reporting/delivery/contracts/DeliveryProvider.ts
import { DeliveryRequest } from "./DeliveryRequest";
import { DeliveryResult } from "./DeliveryResult";
import { DeliveryProviderMetadata } from "./DeliveryCapabilities";

export interface DeliveryProvider {
  readonly metadata: DeliveryProviderMetadata;
  deliver(request: DeliveryRequest): Promise<Omit<DeliveryResult, "durationMs">>;
  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
}
