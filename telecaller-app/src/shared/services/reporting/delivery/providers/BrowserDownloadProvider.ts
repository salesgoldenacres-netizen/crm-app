// src/shared/services/reporting/delivery/providers/BrowserDownloadProvider.ts
import { DeliveryProvider } from "../contracts/DeliveryProvider";
import { DeliveryRequest } from "../contracts/DeliveryRequest";
import { DeliveryResult } from "../contracts/DeliveryResult";
import { DeliveryProviderMetadata } from "../contracts/DeliveryCapabilities";
import { BrowserDownloadTransportAdapter } from "../adapters/BrowserDownloadTransportAdapter";
import { ProviderConfiguration } from "../contracts/ProviderConfiguration";
import { TimeoutTransportDecorator } from "../adapters/TimeoutTransportDecorator";
import { DeliveryValidationError } from "../DeliveryErrors";

export class BrowserDownloadProvider implements DeliveryProvider {
  public readonly metadata: DeliveryProviderMetadata = {
    name: "Browser Download Provider",
    version: "1.0.0",
    providerType: "browser",
    capabilities: {
      supportsAttachments: false,
      supportsStreaming: false,
      supportsLargeFiles: true,
      maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
    },
  };

  private readonly transport: BrowserDownloadTransportAdapter;

  constructor(
    transport: BrowserDownloadTransportAdapter,
    config: ProviderConfiguration
  ) {
    this.transport = new TimeoutTransportDecorator(transport, config.timeoutMs);
  }

  public async deliver(request: DeliveryRequest): Promise<Omit<DeliveryResult, "durationMs">> {
    const fileBytes = request.exportResult.sizeBytes;
    const maxBytes = this.metadata.capabilities.maxFileSizeBytes;
    if (maxBytes && fileBytes > maxBytes) {
      throw new DeliveryValidationError(
        `[BrowserDownloadProvider] Export size (${fileBytes} bytes) exceeds limit of ${maxBytes} bytes.`
      );
    }

    const transportRequest = {
      exportResult: request.exportResult,
    };

    const response = await this.transport.execute(transportRequest);

    return {
      requestId: request.id,
      provider: "browser",
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
