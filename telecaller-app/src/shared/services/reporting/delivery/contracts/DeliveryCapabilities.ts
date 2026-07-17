// src/shared/services/reporting/delivery/contracts/DeliveryCapabilities.ts
import { DeliveryProviderType } from "./DeliveryProviderType";

export interface DeliveryCapabilities {
  readonly supportsAttachments: boolean;
  readonly supportsStreaming: boolean;
  readonly supportsLargeFiles: boolean;
  readonly maxFileSizeBytes?: number;
}

export interface DeliveryProviderMetadata {
  readonly name: string;
  readonly version: string;
  readonly providerType: DeliveryProviderType;
  readonly capabilities: DeliveryCapabilities;
}
