// src/shared/services/reporting/history/contracts/ExecutionSummary.ts
import { ExecutionRecord } from "./ExecutionRecord";
import { DeliveryRecord } from "./DeliveryRecord";
import { ExecutionMetrics } from "./ExecutionMetrics";

export interface ExecutionSummary {
  readonly execution: ExecutionRecord;
  readonly export?: {
    readonly filename: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
    readonly durationMs: number;
  };
  readonly delivery?: DeliveryRecord;
  readonly metrics: ExecutionMetrics;
}
