// src/shared/services/reporting/history/contracts/DeliveryRecord.ts
import { DeliveryProviderType } from "../../delivery/contracts/DeliveryProviderType";

export type DeliveryStatus = "pending" | "completed" | "failed";

export interface DeliveryRecord {
  readonly provider: DeliveryProviderType;
  readonly status: DeliveryStatus;
  readonly deliveredAt: string;
  readonly durationMs: number;
  readonly reference?: string;
  readonly error?: string;
}
