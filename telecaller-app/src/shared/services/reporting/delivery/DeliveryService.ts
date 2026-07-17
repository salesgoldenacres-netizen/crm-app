// src/shared/services/reporting/delivery/DeliveryService.ts
import { DeliveryRequest } from "./contracts/DeliveryRequest";
import { DeliveryResult } from "./contracts/DeliveryResult";
import registry, { DeliveryProviderRegistry } from "./DeliveryProviderRegistry";
import {
  DeliveryProviderNotFoundError,
  DeliveryValidationError,
  DeliveryProviderExecutionError,
} from "./DeliveryErrors";
import { executionHistoryService, ExecutionHistoryService } from "../history/ExecutionHistoryService";

export class DeliveryService {
  constructor(
    private readonly registryMap: DeliveryProviderRegistry = registry,
    private readonly historyService: ExecutionHistoryService = executionHistoryService
  ) {}

  /**
   * Orchestrates validation and forwards payload details to registry providers,
   * appending execution timing stats platform-neutrally.
   */
  public async deliverExport(request: DeliveryRequest): Promise<DeliveryResult> {
    if (!request) {
      throw new DeliveryValidationError("[DeliveryService] Delivery request parameter must be supplied.");
    }
    if (!request.exportResult) {
      throw new DeliveryValidationError("[DeliveryService] Missing exportResult in delivery request.");
    }

    const provider = this.registryMap.getProvider(request.providerType);
    if (!provider) {
      throw new DeliveryProviderNotFoundError(`[DeliveryService] Delivery provider type ${request.providerType} not found.`);
    }

    const start = performance.now();
    try {
      const intermediate = await provider.deliver(request);
      const durationMs = performance.now() - start;

      // Publish delivery event
      try {
        await this.historyService.recordDelivery(
          request.id,
          request.providerType,
          "completed",
          durationMs,
          intermediate.reference
        );
      } catch {
        // Safe fallback if history start was not called/failed
      }

      return Object.freeze({
        ...intermediate,
        durationMs,
      });
    } catch (err: any) {
      const durationMs = performance.now() - start;

      // Publish failed delivery event
      try {
        await this.historyService.recordDelivery(
          request.id,
          request.providerType,
          "failed",
          durationMs,
          undefined,
          err.message
        );
      } catch {
        // Safe fallback if history start was not called/failed
      }

      throw new DeliveryProviderExecutionError(
        `[DeliveryService] Provider execution failed: ${err.message}`,
        { cause: err }
      );
    }
  }
}

export const deliveryService = new DeliveryService();

