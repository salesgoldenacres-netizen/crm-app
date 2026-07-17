// src/shared/services/reporting/scheduling/contracts/JobExecution.ts
import { ScheduleTriggerType } from "./ScheduleDefinition";

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface JobExecution {
  readonly executionId: string;
  readonly jobId: string;
  readonly triggeredAt: string; // ISO-8601
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly durationMs?: number;
  readonly status: JobStatus;
  readonly error?: string;
  readonly triggerType: ScheduleTriggerType;
}
