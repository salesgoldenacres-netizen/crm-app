// src/shared/services/reporting/scheduling/ScheduleService.ts
import { ScheduleDefinition } from "./contracts/ScheduleDefinition";
import { JobRegistry } from "./JobRegistry";
import { JobRunner } from "./JobRunner";
import { JobExecutionResult } from "./contracts/JobExecutionResult";
import { InvalidScheduleConfigurationError } from "./SchedulingErrors";

export class ScheduleService {
  private schedules = new Map<string, ScheduleDefinition>();

  constructor(
    private readonly registry: JobRegistry,
    private readonly runner: JobRunner
  ) {}

  /**
   * Validates configs, registers scheduled scopes, and delegates triggers to the runner.
   * State-free execution manager: doesn't keep running track arrays inside service attributes.
   */
  public registerSchedule(schedule: ScheduleDefinition): void {
    if (!schedule.jobId) {
      throw new InvalidScheduleConfigurationError("[ScheduleService] Missing jobId in configuration.");
    }
    if (schedule.triggerType === "cron" && !schedule.configuration.expression) {
      throw new InvalidScheduleConfigurationError("[ScheduleService] Missing cron expression configuration.");
    }

    this.schedules.set(schedule.jobId, schedule);
  }

  public async triggerSchedule(jobId: string, generatedBy: string): Promise<JobExecutionResult> {
    const schedule = this.schedules.get(jobId);
    if (!schedule || !schedule.enabled) {
      throw new InvalidScheduleConfigurationError(`[ScheduleService] Schedule for job ${jobId} is disabled or missing.`);
    }

    const job = this.registry.getJob(jobId);
    return this.runner.runJob(job, schedule.triggerType, generatedBy);
  }

  public getSchedules(): readonly ScheduleDefinition[] {
    return Object.freeze(Array.from(this.schedules.values()));
  }

  public clear(): void {
    this.schedules.clear();
  }
}
