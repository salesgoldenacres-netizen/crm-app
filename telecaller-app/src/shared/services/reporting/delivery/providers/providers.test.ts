// src/shared/services/reporting/delivery/providers/providers.test.ts
import { describe, it, expect } from "vitest";
import { EmailDeliveryProvider } from "./EmailDeliveryProvider";
import { StorageDeliveryProvider } from "./StorageDeliveryProvider";
import { WebhookDeliveryProvider } from "./WebhookDeliveryProvider";
import { BrowserDownloadProvider } from "./BrowserDownloadProvider";
import { MockEmailTransportAdapter } from "../adapters/mock/MockEmailTransportAdapter";
import { MockStorageTransportAdapter } from "../adapters/mock/MockStorageTransportAdapter";
import { MockWebhookTransportAdapter } from "../adapters/mock/MockWebhookTransportAdapter";
import { MockBrowserDownloadTransportAdapter } from "../adapters/mock/MockBrowserDownloadTransportAdapter";
import { DeliveryProviderFactory } from "../DeliveryProviderFactory";
import { DeliveryValidationError } from "../DeliveryErrors";
import { DeliveryRequest } from "../contracts/DeliveryRequest";
import { ExportResult } from "../../export/contracts/ExportResult";
import { DeliveryService } from "../DeliveryService";
import { DeliveryProviderRegistry } from "../DeliveryProviderRegistry";

describe("Wave 9 Phase 6 Concrete Delivery Providers & Adapters", () => {
  const mockExport: ExportResult = {
    filename: "sales-report.csv",
    mimeType: "text/csv",
    content: "mock content",
    generatedAt: new Date().toISOString(),
    sizeBytes: 100,
  };

  const mockRequest: DeliveryRequest = {
    id: "req123",
    exportResult: mockExport,
    providerType: "email",
    context: {
      requestedBy: "manager1",
      correlationId: "corr123",
    },
  };

  const defaultConfig = { enabled: true, timeoutMs: 2000 };

  describe("Provider Metadata and Capabilities", () => {
    it("exposes capabilities and metadata properties on providers", () => {
      const emailProvider = new EmailDeliveryProvider(new MockEmailTransportAdapter(), defaultConfig);
      expect(emailProvider.metadata.name).toBe("Email Delivery Provider");
      expect(emailProvider.metadata.version).toBe("1.0.0");
      expect(emailProvider.metadata.capabilities.supportsAttachments).toBe(true);

      const storageProvider = new StorageDeliveryProvider(new MockStorageTransportAdapter(), defaultConfig);
      expect(storageProvider.metadata.capabilities.supportsStreaming).toBe(true);

      const browserProvider = new BrowserDownloadProvider(new MockBrowserDownloadTransportAdapter(), defaultConfig);
      expect(browserProvider.metadata.capabilities.maxFileSizeBytes).toBeDefined();
    });
  });

  describe("Configuration & Limits Validation", () => {
    it("throws DeliveryValidationError if file size exceeds capability limits", async () => {
      const emailProvider = new EmailDeliveryProvider(new MockEmailTransportAdapter(), defaultConfig);
      const largeExport: ExportResult = {
        ...mockExport,
        sizeBytes: 50 * 1024 * 1024, // 50MB
      };

      const largeRequest: DeliveryRequest = {
        ...mockRequest,
        exportResult: largeExport,
      };

      await expect(emailProvider.deliver(largeRequest)).rejects.toThrow(DeliveryValidationError);
    });
  });

  describe("Timeout Handling Decorator", () => {
    it("throws an error when the transport exceeds the timeoutMs duration limit", async () => {
      // Create a slow transport that takes 100ms
      const slowEmailAdapter = {
        execute: async (_req: any) => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return {
            success: true,
            messageId: "123",
            completedAt: new Date().toISOString(),
            durationMs: 100,
          };
        },
      };

      // Set timeoutMs to 20ms
      const shortTimeoutConfig = { enabled: true, timeoutMs: 20 };
      const emailProvider = new EmailDeliveryProvider(slowEmailAdapter, shortTimeoutConfig);

      await expect(emailProvider.deliver(mockRequest)).rejects.toThrow(/timed out after/);
    });
  });

  describe("DeliveryProviderFactory & Composition", () => {
    it("manages registration and instantiation of dynamic builders", () => {
      const factory = new DeliveryProviderFactory();

      factory.register("email", () => new EmailDeliveryProvider(new MockEmailTransportAdapter(), defaultConfig));
      const provider = factory.create("email");

      expect(provider.metadata.providerType).toBe("email");
      expect(() => factory.register("email", () => ({} as any))).toThrow(/already registered/);
    });

    it("throws when resolving non-registered provider builders", () => {
      const factory = new DeliveryProviderFactory();
      expect(() => factory.create("storage")).toThrow(/No provider builder registered/);
    });
  });

  describe("E2E Integration via DeliveryService", () => {
    it("coordinates transport adapter calls and returns immutable results", async () => {
      const registry = new DeliveryProviderRegistry();
      const factory = new DeliveryProviderFactory();

      // Composition registration
      factory.register("email", () => new EmailDeliveryProvider(new MockEmailTransportAdapter(), defaultConfig));
      factory.register("webhook", () => new WebhookDeliveryProvider(new MockWebhookTransportAdapter(), defaultConfig));

      // Registry bindings
      registry.register("email", factory.create("email"));
      registry.register("webhook", factory.create("webhook"));

      const service = new DeliveryService(registry);

      const emailResult = await service.deliverExport(mockRequest);
      expect(emailResult.status).toBe("completed");
      expect(emailResult.durationMs).toBeGreaterThanOrEqual(0);
      expect(Object.isFrozen(emailResult)).toBe(true);

      const webhookRequest: DeliveryRequest = {
        ...mockRequest,
        providerType: "webhook",
        context: {
          ...mockRequest.context,
          tags: ["https://api.test/hook"],
        },
      };

      const webhookResult = await service.deliverExport(webhookRequest);
      expect(webhookResult.status).toBe("completed");
      expect(webhookResult.reference).toBe("mock_http_endpoint");
    });
  });

  describe("Lifecycle Hooks", () => {
    it("calls optional initialize and dispose hooks if defined on transport adapters", async () => {
      let initCalled = false;
      let disposeCalled = false;

      const mockAdapter: any = {
        execute: async () => ({ success: true, messageId: "1", completedAt: "", durationMs: 0 }),
        initialize: async () => { initCalled = true; },
        dispose: async () => { disposeCalled = true; },
      };

      const provider = new EmailDeliveryProvider(mockAdapter, defaultConfig);

      await provider.initialize?.();
      await provider.dispose?.();

      expect(initCalled).toBe(true);
      expect(disposeCalled).toBe(true);
    });
  });
});
