// src/shared/services/reporting/delivery/contracts/DeliveryResult.ts
import { DeliveryProviderType } from "./DeliveryProviderType";

export interface DeliveryResult {
  readonly requestId: string;
  readonly provider: DeliveryProviderType;
  readonly status: "completed" | "failed";
  readonly deliveredAt: string; // ISO-8601
  readonly durationMs: number;
  readonly reference?: string;
  readonly error?: string;
}
