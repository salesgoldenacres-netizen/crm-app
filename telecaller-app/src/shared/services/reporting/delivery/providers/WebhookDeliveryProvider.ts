// src/shared/services/reporting/delivery/providers/WebhookDeliveryProvider.ts
import { DeliveryProvider } from "../contracts/DeliveryProvider";
import { DeliveryRequest } from "../contracts/DeliveryRequest";
import { DeliveryResult } from "../contracts/DeliveryResult";
import { DeliveryProviderMetadata } from "../contracts/DeliveryCapabilities";
import { WebhookTransportAdapter } from "../adapters/WebhookTransportAdapter";
import { ProviderConfiguration } from "../contracts/ProviderConfiguration";
import { TimeoutTransportDecorator } from "../adapters/TimeoutTransportDecorator";
import { DeliveryValidationError } from "../DeliveryErrors";

export class WebhookDeliveryProvider implements DeliveryProvider {
  public readonly metadata: DeliveryProviderMetadata = {
    name: "Webhook Delivery Provider",
    version: "1.0.0",
    providerType: "webhook",
    capabilities: {
      supportsAttachments: false,
      supportsStreaming: false,
      supportsLargeFiles: false,
      maxFileSizeBytes: 2 * 1024 * 1024, // 2MB
    },
  };

  private readonly transport: WebhookTransportAdapter;

  constructor(
    transport: WebhookTransportAdapter,
    config: ProviderConfiguration
  ) {
    this.transport = new TimeoutTransportDecorator(transport, config.timeoutMs);
  }

  public async deliver(request: DeliveryRequest): Promise<Omit<DeliveryResult, "durationMs">> {
    const fileBytes = request.exportResult.sizeBytes;
    const maxBytes = this.metadata.capabilities.maxFileSizeBytes;
    if (maxBytes && fileBytes > maxBytes) {
      throw new DeliveryValidationError(
        `[WebhookDeliveryProvider] Export size (${fileBytes} bytes) exceeds limit of ${maxBytes} bytes.`
      );
    }

    const url = request.context.tags?.[0] || "https://api.goldenacres.local/webhook";

    const transportRequest = {
      url,
      payload: JSON.stringify({
        filename: request.exportResult.filename,
        content: request.exportResult.content,
        generatedAt: request.exportResult.generatedAt,
      }),
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-ID": request.context.correlationId || "",
      },
    };

    const response = await this.transport.execute(transportRequest);

    return {
      requestId: request.id,
      provider: "webhook",
      status: response.success ? "completed" : "failed",
      deliveredAt: response.completedAt,
      reference: response.reference,
      error: response.error,
    };
  }

  public async initialize(): Promise<void> {
    const t: any = this.transport;
    if (t.decoratee && typeof t.decoratee.initialize === "function") {
      await t.decoratee.initialize();
    }
  }

  public async dispose(): Promise<void> {
    const t: any = this.transport;
    if (t.decoratee && typeof t.decoratee.dispose === "function") {
      await t.decoratee.dispose();
    }
  }
}
