// src/shared/services/reporting/scheduling/JobRegistry.ts
import { ScheduledJob } from "./contracts/ScheduledJob";
import { DuplicateJobError, JobNotFoundError } from "./SchedulingErrors";

export class JobRegistry {
  private jobs = new Map<string, ScheduledJob>();

  public getJob(id: string): ScheduledJob {
    const job = this.jobs.get(id);
    if (!job) {
      throw new JobNotFoundError(`[JobRegistry] Job with ID ${id} cannot be resolved.`);
    }
    return job;
  }

  public register(job: ScheduledJob): void {
    if (this.jobs.has(job.id)) {
      throw new DuplicateJobError(`[JobRegistry] Duplicate registration error: ID ${job.id} already exists.`);
    }
    this.jobs.set(job.id, job);
  }

  public getRegisteredJobs(): readonly ScheduledJob[] {
    return Object.freeze(Array.from(this.jobs.values()));
  }

  public clear(): void {
    this.jobs.clear();
  }
}

export const jobRegistry = new JobRegistry();
