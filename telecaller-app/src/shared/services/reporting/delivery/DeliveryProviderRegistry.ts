// src/shared/services/reporting/delivery/DeliveryProviderRegistry.ts
import { DeliveryProvider } from "./contracts/DeliveryProvider";
import { DeliveryProviderType } from "./contracts/DeliveryProviderType";
import { EmailDeliveryProvider } from "./providers/EmailDeliveryProvider";
import { StorageDeliveryProvider } from "./providers/StorageDeliveryProvider";
import { WebhookDeliveryProvider } from "./providers/WebhookDeliveryProvider";
import { BrowserDownloadProvider } from "./providers/BrowserDownloadProvider";
import { DuplicateDeliveryProviderError } from "./DeliveryErrors";

import { MockEmailTransportAdapter } from "./adapters/mock/MockEmailTransportAdapter";
import { MockStorageTransportAdapter } from "./adapters/mock/MockStorageTransportAdapter";
import { MockWebhookTransportAdapter } from "./adapters/mock/MockWebhookTransportAdapter";
import { MockBrowserDownloadTransportAdapter } from "./adapters/mock/MockBrowserDownloadTransportAdapter";

export class DeliveryProviderRegistry {
  private providers = new Map<DeliveryProviderType, DeliveryProvider>();

  public getProvider(type: DeliveryProviderType): DeliveryProvider | undefined {
    return this.providers.get(type);
  }

  public register(type: DeliveryProviderType, provider: DeliveryProvider): void {
    if (this.providers.has(type)) {
      throw new DuplicateDeliveryProviderError(`[DeliveryProviderRegistry] Duplicate registration error: ${type} already exists.`);
    }
    this.providers.set(type, provider);
  }
}

const defaultConfig = { enabled: true, timeoutMs: 5000 };

const registry = new DeliveryProviderRegistry();
registry.register("email", new EmailDeliveryProvider(new MockEmailTransportAdapter(), defaultConfig));
registry.register("storage", new StorageDeliveryProvider(new MockStorageTransportAdapter(), defaultConfig));
registry.register("webhook", new WebhookDeliveryProvider(new MockWebhookTransportAdapter(), defaultConfig));
registry.register("browser", new BrowserDownloadProvider(new MockBrowserDownloadTransportAdapter(), defaultConfig));

export default registry;
export { registry as deliveryProviderRegistry };
