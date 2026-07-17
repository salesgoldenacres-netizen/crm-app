// src/shared/services/reporting/delivery/adapters/StorageTransportAdapter.ts
import { DeliveryTransport, TransportResponse } from "../contracts/DeliveryTransport";
import { ExportResult } from "../../export/contracts/ExportResult";

export interface StorageUploadRequest {
  readonly exportResult: ExportResult;
  readonly path: string;
}

export interface StorageUploadResponse extends TransportResponse {
  readonly objectKey: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface StorageTransportAdapter extends DeliveryTransport<StorageUploadRequest, StorageUploadResponse> {}
