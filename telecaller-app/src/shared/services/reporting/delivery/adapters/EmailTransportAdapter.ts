// src/shared/services/reporting/delivery/adapters/EmailTransportAdapter.ts
import { DeliveryTransport, TransportResponse } from "../contracts/DeliveryTransport";
import { ExportResult } from "../../export/contracts/ExportResult";

export interface EmailTransportRequest {
  readonly recipient: string;
  readonly subject: string;
  readonly attachment: ExportResult;
}

export interface EmailTransportResponse extends TransportResponse {
  readonly messageId: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EmailTransportAdapter extends DeliveryTransport<EmailTransportRequest, EmailTransportResponse> {}
