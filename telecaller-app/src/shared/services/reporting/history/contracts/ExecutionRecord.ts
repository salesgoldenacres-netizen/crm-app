// src/shared/services/reporting/history/contracts/ExecutionRecord.ts
import { ExecutionStatus } from "./ExecutionStatus";
import { ScheduleTriggerType } from "../../scheduling/contracts/ScheduleDefinition";

export interface ExecutionRecord {
  readonly executionId: string;
  readonly correlationId: string;
  readonly jobId: string;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly durationMs?: number;
  readonly status: ExecutionStatus;
  readonly triggerType: ScheduleTriggerType;
  readonly error?: string;
}
