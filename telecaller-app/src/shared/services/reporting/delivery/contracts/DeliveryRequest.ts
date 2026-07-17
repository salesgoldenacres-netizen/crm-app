// src/shared/services/reporting/delivery/contracts/DeliveryRequest.ts
import { ExportResult } from "../../export/contracts/ExportResult";
import { DeliveryProviderType } from "./DeliveryProviderType";
import { DeliveryContext } from "./DeliveryContext";

export interface DeliveryRequest {
  readonly id: string;
  readonly exportResult: ExportResult;
  readonly providerType: DeliveryProviderType;
  readonly context: DeliveryContext;
}
