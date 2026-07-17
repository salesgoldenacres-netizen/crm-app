// src/shared/services/reporting/scheduling/contracts/ScheduleDefinition.ts
export type ScheduleTriggerType = "cron" | "manual" | "api" | "queue";

export interface ScheduleDefinition {
  readonly jobId: string;
  readonly triggerType: ScheduleTriggerType;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly enabled: boolean;
}
