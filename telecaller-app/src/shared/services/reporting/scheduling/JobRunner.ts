// src/shared/services/reporting/scheduling/JobRunner.ts
import { ScheduledJob } from "./contracts/ScheduledJob";
import { JobExecutor } from "./JobExecutor";
import { JobExecutionResult } from "./contracts/JobExecutionResult";
import { Clock, SystemClock } from "./contracts/Clock";
import { JobExecution } from "./contracts/JobExecution";
import { ScheduleTriggerType } from "./contracts/ScheduleDefinition";
import { executionHistoryService, ExecutionHistoryService } from "../history/ExecutionHistoryService";

export class JobRunner {
  private activeExecutions = new Map<string, JobExecution>();

  constructor(
    private readonly executor: JobExecutor,
    private readonly clock: Clock = new SystemClock(),
    private readonly historyService: ExecutionHistoryService = executionHistoryService
  ) {}

  /**
   * Orchestrates the active job run state and timing lifecycle.
   */
  public async runJob(
    job: ScheduledJob,
    triggerType: ScheduleTriggerType,
    generatedBy: string
  ): Promise<JobExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const nowIso = this.clock.now().toISOString();

    // Publish start event
    await this.historyService.startExecution(job.id, triggerType, undefined, executionId);

    const pendingExecution: JobExecution = {
      executionId,
      jobId: job.id,
      triggeredAt: nowIso,
      startedAt: nowIso,
      status: "running",
      triggerType,
    };
    this.activeExecutions.set(executionId, pendingExecution);

    try {
      const result = await this.executor.executeJob(job, executionId, generatedBy);

      // Publish completed event
      await this.historyService.completeExecution(executionId, result.durationMs);

      const completedExecution: JobExecution = {
        ...pendingExecution,
        completedAt: this.clock.now().toISOString(),
        durationMs: result.durationMs,
        status: "completed",
      };
      this.activeExecutions.set(executionId, completedExecution);

      return result;
    } catch (err: any) {
      const durationMs = this.clock.now().getTime() - new Date(pendingExecution.startedAt).getTime();
      
      // Publish failed event
      try {
        await this.historyService.failExecution(executionId, durationMs, err.message);
      } catch {
        // Safe fallback if history start failed or record is missing
      }

      const failedExecution: JobExecution = {
        ...pendingExecution,
        completedAt: this.clock.now().toISOString(),
        status: "failed",
        error: err.message,
      };
      this.activeExecutions.set(executionId, failedExecution);
      throw err;
    }
  }

  public getActiveExecution(executionId: string): JobExecution | undefined {
    return this.activeExecutions.get(executionId);
  }
}

