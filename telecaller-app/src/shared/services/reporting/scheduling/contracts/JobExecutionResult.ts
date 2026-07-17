// src/shared/services/reporting/scheduling/contracts/JobExecutionResult.ts
import { JobStatus } from "./JobExecution";

export interface JobExecutionResult {
  readonly executionId: string;
  readonly status: Extract<JobStatus, "completed" | "failed">;
  readonly reportId?: string;
  readonly exportFilename?: string;
  readonly durationMs: number;
}
