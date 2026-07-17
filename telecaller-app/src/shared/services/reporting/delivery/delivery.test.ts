import { describe, it, expect } from "vitest";
import { DeliveryService } from "./DeliveryService";
import { DeliveryProviderRegistry } from "./DeliveryProviderRegistry";
import { DeliveryRequest } from "./contracts/DeliveryRequest";
import { DeliveryProvider } from "./contracts/DeliveryProvider";
import { ExportResult } from "../export/contracts/ExportResult";
import {
  DuplicateDeliveryProviderError,
  DeliveryProviderNotFoundError,
  DeliveryValidationError,
  DeliveryProviderExecutionError,
} from "./DeliveryErrors";

describe("Wave 9 Phase 4 Delivery Infrastructure", () => {
  const mockExport: ExportResult = {
    filename: "sales-report.csv",
    mimeType: "text/csv",
    content: "mock content",
    generatedAt: new Date().toISOString(),
    sizeBytes: 12,
  };

  const mockRequest: DeliveryRequest = {
    id: "req1",
    exportResult: mockExport,
    providerType: "email",
    context: {
      requestedBy: "manager1",
      correlationId: "correlation1",
    },
  };

  describe("DeliveryProviderRegistry", () => {
    it("manages registrations and resolution boundaries", () => {
      const registry = new DeliveryProviderRegistry();
      expect(registry.getProvider("email")).toBeUndefined();

      const dummyProvider = {} as any;
      registry.register("email", dummyProvider);
      expect(registry.getProvider("email")).toBe(dummyProvider);
    });

    it("throws DuplicateDeliveryProviderError on duplicates", () => {
      const registry = new DeliveryProviderRegistry();
      const dummyProvider = {} as any;
      registry.register("email", dummyProvider);
      expect(() => registry.register("email", dummyProvider)).toThrow(DuplicateDeliveryProviderError);
    });
  });

  describe("DeliveryService & Orchestration", () => {
    it("calculates execution duration and maps results accurately", async () => {
      const registry = new DeliveryProviderRegistry();
      const mockProvider: DeliveryProvider = {
        metadata: {
          name: "Mock Provider",
          version: "1.0.0",
          providerType: "email",
          capabilities: {
            supportsAttachments: true,
            supportsStreaming: false,
            supportsLargeFiles: false,
          },
        },
        deliver: async (req) => ({
          requestId: req.id,
          provider: "email",
          status: "completed" as const,
          deliveredAt: new Date().toISOString(),
          reference: "smtp_ref_123",
        }),
      };
      registry.register("email", mockProvider);

      const service = new DeliveryService(registry);
      const result = await service.deliverExport(mockRequest);

      expect(result.status).toBe("completed");
      expect(result.reference).toBe("smtp_ref_123");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("throws ValidationError on null requests", async () => {
      const service = new DeliveryService();
      await expect(service.deliverExport(null as any)).rejects.toThrow(DeliveryValidationError);
    });

    it("throws ProviderNotFoundError for missing provider resolutions", async () => {
      const registry = new DeliveryProviderRegistry();
      const service = new DeliveryService(registry);
      await expect(service.deliverExport(mockRequest)).rejects.toThrow(DeliveryProviderNotFoundError);
    });

    it("wraps third party exceptions inside DeliveryProviderExecutionError", async () => {
      const registry = new DeliveryProviderRegistry();
      const mockProvider: DeliveryProvider = {
        metadata: {
          name: "Mock Provider",
          version: "1.0.0",
          providerType: "email",
          capabilities: {
            supportsAttachments: true,
            supportsStreaming: false,
            supportsLargeFiles: false,
          },
        },
        deliver: async () => {
          throw new Error("SMTP Auth Failure");
        },
      };
      registry.register("email", mockProvider);

      const service = new DeliveryService(registry);
      await expect(service.deliverExport(mockRequest)).rejects.toThrow(DeliveryProviderExecutionError);
    });
  });
});
