// src/shared/services/reporting/delivery/providers/StorageDeliveryProvider.ts
import { DeliveryProvider } from "../contracts/DeliveryProvider";
import { DeliveryRequest } from "../contracts/DeliveryRequest";
import { DeliveryResult } from "../contracts/DeliveryResult";
import { DeliveryProviderMetadata } from "../contracts/DeliveryCapabilities";
import { StorageTransportAdapter } from "../adapters/StorageTransportAdapter";
import { ProviderConfiguration } from "../contracts/ProviderConfiguration";
import { TimeoutTransportDecorator } from "../adapters/TimeoutTransportDecorator";
import { DeliveryValidationError } from "../DeliveryErrors";

export class StorageDeliveryProvider implements DeliveryProvider {
  public readonly metadata: DeliveryProviderMetadata = {
    name: "Storage Delivery Provider",
    version: "1.0.0",
    providerType: "storage",
    capabilities: {
      supportsAttachments: false,
      supportsStreaming: true,
      supportsLargeFiles: true,
      maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
    },
  };

  private readonly transport: StorageTransportAdapter;

  constructor(
    transport: StorageTransportAdapter,
    config: ProviderConfiguration
  ) {
    this.transport = new TimeoutTransportDecorator(transport, config.timeoutMs);
  }

  public async deliver(request: DeliveryRequest): Promise<Omit<DeliveryResult, "durationMs">> {
    const fileBytes = request.exportResult.sizeBytes;
    const maxBytes = this.metadata.capabilities.maxFileSizeBytes;
    if (maxBytes && fileBytes > maxBytes) {
      throw new DeliveryValidationError(
        `[StorageDeliveryProvider] Export size (${fileBytes} bytes) exceeds limit of ${maxBytes} bytes.`
      );
    }

    const path = request.context.correlationId || "exports";

    const transportRequest = {
      exportResult: request.exportResult,
      path,
    };

    const response = await this.transport.execute(transportRequest);

    return {
      requestId: request.id,
      provider: "storage",
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
