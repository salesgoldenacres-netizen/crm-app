// src/shared/services/reporting/delivery/adapters/BrowserDownloadTransportAdapter.ts
import { DeliveryTransport, TransportResponse } from "../contracts/DeliveryTransport";
import { ExportResult } from "../../export/contracts/ExportResult";

export interface BrowserDownloadRequest {
  readonly exportResult: ExportResult;
}

export interface BrowserDownloadResponse extends TransportResponse {
  readonly downloaded: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BrowserDownloadTransportAdapter extends DeliveryTransport<BrowserDownloadRequest, BrowserDownloadResponse> {}
