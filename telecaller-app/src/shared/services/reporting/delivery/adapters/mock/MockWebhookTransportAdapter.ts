// src/shared/services/reporting/delivery/adapters/mock/MockWebhookTransportAdapter.ts
import { WebhookTransportAdapter, WebhookTransportRequest, WebhookTransportResponse } from "../WebhookTransportAdapter";

export class MockWebhookTransportAdapter implements WebhookTransportAdapter {
  public async execute(_request: WebhookTransportRequest): Promise<WebhookTransportResponse> {
    const start = performance.now();
    return {
      success: true,
      statusCode: 200,
      reference: "mock_http_endpoint",
      completedAt: new Date().toISOString(),
      durationMs: performance.now() - start,
    };
  }
}
