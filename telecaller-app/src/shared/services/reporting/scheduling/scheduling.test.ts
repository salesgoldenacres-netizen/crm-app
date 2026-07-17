import { describe, it, expect } from "vitest";
import { JobRegistry } from "./JobRegistry";
import { JobExecutor } from "./JobExecutor";
import { JobRunner } from "./JobRunner";
import { ScheduleService } from "./ScheduleService";
import { ScheduledJob } from "./contracts/ScheduledJob";
import { ScheduleDefinition } from "./contracts/ScheduleDefinition";
import { Clock } from "./contracts/Clock";
import { ReportingService } from "../ReportingService";
import { ExportService } from "../export/ExportService";
import { Report } from "../contracts/Report";
import {
  DuplicateJobError,
  JobNotFoundError,
  JobExecutionError,
  InvalidScheduleConfigurationError,
} from "./SchedulingErrors";

describe("Wave 9 Phase 3 Scheduling & Execution Infrastructure", () => {
  const mockReport: Report<any> = {
    id: "rep123",
    title: "Lead Summary",
    generatedAt: new Date(),
    metadata: {
      reportType: "lead-summary",
      generatedBy: "system",
      generationDurationMs: 5,
      rowCount: 1,
      version: 1,
    },
    filters: [],
    rows: [{ metric: "Active Leads", value: 150 }],
  };

  const mockReportingService = {
    executeReport: async () => mockReport,
  } as unknown as ReportingService;

  const mockExportService = {
    exportDocument: async () => ({
      filename: "mock-report-file.xlsx",
      mimeType: "xlsx",
      content: new Uint8Array([1, 2, 3]),
    }),
  } as unknown as ExportService;

  const mockJob: ScheduledJob = {
    id: "job1",
    name: "Lead Job",
    reportType: "lead-summary",
    format: "excel",
  };

  const mockClock: Clock = {
    now: () => new Date("2026-07-14T10:00:00.000Z"),
  };

  describe("JobRegistry", () => {
    it("handles job registrations and resolves definitions cleanly", () => {
      const registry = new JobRegistry();
      registry.register(mockJob);

      expect(registry.getJob("job1")).toEqual(mockJob);
      expect(registry.getRegisteredJobs()).toHaveLength(1);
    });

    it("throws DuplicateJobError on duplicate ids", () => {
      const registry = new JobRegistry();
      registry.register(mockJob);
      expect(() => registry.register(mockJob)).toThrow(DuplicateJobError);
    });

    it("throws JobNotFoundError on missing ids", () => {
      const registry = new JobRegistry();
      expect(() => registry.getJob("missing")).toThrow(JobNotFoundError);
    });
  });

  describe("JobRunner & JobExecutor", () => {
    it("runs jobs and logs metadata timing and execution parameters correctly", async () => {
      const executor = new JobExecutor(mockReportingService, mockExportService);
      const runner = new JobRunner(executor, mockClock);

      const result = await runner.runJob(mockJob, "cron", "system-scheduler");
      expect(result.status).toBe("completed");
      expect(result.exportFilename).toBe("mock-report-file.xlsx");

      const exec = runner.getActiveExecution(result.executionId);
      expect(exec).toBeDefined();
      expect(exec?.status).toBe("completed");
      expect(exec?.triggeredAt).toBe("2026-07-14T10:00:00.000Z");
      expect(exec?.triggerType).toBe("cron");
    });

    it("handles execution failures and formats JobExecution states to failed", async () => {
      const failingReporting = {
        executeReport: async () => {
          throw new Error("DB Error");
        },
      } as unknown as ReportingService;

      const executor = new JobExecutor(failingReporting, mockExportService);
      const runner = new JobRunner(executor, mockClock);

      await expect(runner.runJob(mockJob, "cron", "system")).rejects.toThrow(JobExecutionError);
    });
  });

  describe("ScheduleService", () => {
    it("registers schedule definitions and executes task runner triggers successfully", async () => {
      const registry = new JobRegistry();
      registry.register(mockJob);

      const executor = new JobExecutor(mockReportingService, mockExportService);
      const runner = new JobRunner(executor, mockClock);

      const scheduleService = new ScheduleService(registry, runner);

      const schedule: ScheduleDefinition = {
        jobId: "job1",
        triggerType: "cron",
        configuration: { expression: "0 9 * * *" },
        enabled: true,
      };

      scheduleService.registerSchedule(schedule);
      expect(scheduleService.getSchedules()).toHaveLength(1);

      const result = await scheduleService.triggerSchedule("job1", "timer-event");
      expect(result.status).toBe("completed");
    });

    it("throws error for missing configuration fields", () => {
      const registry = new JobRegistry();
      const executor = new JobExecutor(mockReportingService, mockExportService);
      const runner = new JobRunner(executor, mockClock);
      const service = new ScheduleService(registry, runner);

      const invalid: ScheduleDefinition = {
        jobId: "job1",
        triggerType: "cron",
        configuration: {},
        enabled: true,
      };

      expect(() => service.registerSchedule(invalid)).toThrow(InvalidScheduleConfigurationError);
    });
  });
});
