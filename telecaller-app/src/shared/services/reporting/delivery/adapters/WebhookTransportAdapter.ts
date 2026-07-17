// src/shared/services/reporting/delivery/adapters/WebhookTransportAdapter.ts
import { DeliveryTransport, TransportResponse } from "../contracts/DeliveryTransport";

export interface WebhookTransportRequest {
  readonly url: string;
  readonly payload: string;
  readonly headers?: Record<string, string>;
}

export interface WebhookTransportResponse extends TransportResponse {
  readonly statusCode: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface WebhookTransportAdapter extends DeliveryTransport<WebhookTransportRequest, WebhookTransportResponse> {}
