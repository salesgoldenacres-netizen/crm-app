// src/shared/services/reporting/scheduling/SchedulingErrors.ts
export class SchedulingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchedulingError";
  }
}

export class JobNotFoundError extends SchedulingError {}
export class DuplicateJobError extends SchedulingError {}
export class JobExecutionError extends SchedulingError {}
export class InvalidScheduleConfigurationError extends SchedulingError {}
