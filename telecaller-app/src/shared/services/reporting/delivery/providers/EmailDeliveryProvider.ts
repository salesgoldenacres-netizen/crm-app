// src/shared/services/reporting/delivery/providers/EmailDeliveryProvider.ts
import { DeliveryProvider } from "../contracts/DeliveryProvider";
import { DeliveryRequest } from "../contracts/DeliveryRequest";
import { DeliveryResult } from "../contracts/DeliveryResult";
import { DeliveryProviderMetadata } from "../contracts/DeliveryCapabilities";
import { EmailTransportAdapter } from "../adapters/EmailTransportAdapter";
import { ProviderConfiguration } from "../contracts/ProviderConfiguration";
import { TimeoutTransportDecorator } from "../adapters/TimeoutTransportDecorator";
import { DeliveryValidationError } from "../DeliveryErrors";

export class EmailDeliveryProvider implements DeliveryProvider {
  public readonly metadata: DeliveryProviderMetadata = {
    name: "Email Delivery Provider",
    version: "1.0.0",
    providerType: "email",
    capabilities: {
      supportsAttachments: true,
      supportsStreaming: false,
      supportsLargeFiles: false,
      maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
    },
  };

  private readonly transport: EmailTransportAdapter;

  constructor(
    transport: EmailTransportAdapter,
    config: ProviderConfiguration
  ) {
    this.transport = new TimeoutTransportDecorator(transport, config.timeoutMs);
  }

  public async deliver(request: DeliveryRequest): Promise<Omit<DeliveryResult, "durationMs">> {
    const fileBytes = request.exportResult.sizeBytes;
    const maxBytes = this.metadata.capabilities.maxFileSizeBytes;
    if (maxBytes && fileBytes > maxBytes) {
      throw new DeliveryValidationError(
        `[EmailDeliveryProvider] Export size (${fileBytes} bytes) exceeds limit of ${maxBytes} bytes.`
      );
    }

    // Extraction contract: resolve email recipient from context requestedBy or tags
    const recipient = request.context.requestedBy || "admin@goldenacres.local";

    const transportRequest = {
      recipient,
      subject: `Report export: ${request.exportResult.filename}`,
      attachment: request.exportResult,
    };

    const response = await this.transport.execute(transportRequest);

    return {
      requestId: request.id,
      provider: "email",
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
