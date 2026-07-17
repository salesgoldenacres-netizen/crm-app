// src/shared/services/reporting/history/history.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { ExecutionHistoryRegistry } from "./ExecutionHistoryRegistry";
import { ExecutionHistoryService } from "./ExecutionHistoryService";
import { CorrelationIdGenerator } from "./CorrelationIdGenerator";
import {
  DuplicateExecutionError,
  ExecutionNotFoundError,
  InvalidExecutionStateError,
} from "./HistoryErrors";
import { JobRunner } from "../scheduling/JobRunner";
import { JobExecutor } from "../scheduling/JobExecutor";
import { ScheduledJob } from "../scheduling/contracts/ScheduledJob";
import { ReportingService } from "../ReportingService";
import { ExportService } from "../export/ExportService";
import { DeliveryService } from "../delivery/DeliveryService";
import { DeliveryProviderRegistry } from "../delivery/DeliveryProviderRegistry";
import { DeliveryProvider } from "../delivery/contracts/DeliveryProvider";
import { ExportResult } from "../export/contracts/ExportResult";
import { DeliveryRequest } from "../delivery/contracts/DeliveryRequest";

describe("Wave 9 Phase 5 Execution History & Observability", () => {
  let registry: ExecutionHistoryRegistry;
  let service: ExecutionHistoryService;

  beforeEach(() => {
    registry = new ExecutionHistoryRegistry();
    service = new ExecutionHistoryService(registry);
  });

  describe("CorrelationIdGenerator", () => {
    it("generates unique correlation IDs", () => {
      const id1 = CorrelationIdGenerator.generate();
      const id2 = CorrelationIdGenerator.generate();
      expect(id1).toBeDefined();
      expect(id1).toMatch(/^corr_/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("ExecutionHistoryRegistry", () => {
    it("adds, updates, and queries records successfully", () => {
      const record = {
        executionId: "exec1",
        correlationId: "corr1",
        jobId: "job1",
        startedAt: new Date().toISOString(),
        status: "running" as const,
        triggerType: "cron" as const,
      };

      registry.addRecord(record);
      expect(registry.getRecord("exec1")).toEqual(record);

      const updated = {
        ...record,
        status: "completed" as const,
        completedAt: new Date().toISOString(),
        durationMs: 120,
      };
      registry.updateRecord(updated);
      expect(registry.getRecord("exec1")).toEqual(updated);
    });

    it("throws DuplicateExecutionError on duplicate registration", () => {
      const record = {
        executionId: "exec1",
        correlationId: "corr1",
        jobId: "job1",
        startedAt: new Date().toISOString(),
        status: "running" as const,
        triggerType: "cron" as const,
      };

      registry.addRecord(record);
      expect(() => registry.addRecord(record)).toThrow(DuplicateExecutionError);
    });

    it("throws ExecutionNotFoundError when updating non-existent record", () => {
      const record = {
        executionId: "exec1",
        correlationId: "corr1",
        jobId: "job1",
        startedAt: new Date().toISOString(),
        status: "running" as const,
        triggerType: "cron" as const,
      };

      expect(() => registry.updateRecord(record)).toThrow(ExecutionNotFoundError);
    });

    it("queries by correlation ID and job ID", () => {
      const record1 = {
        executionId: "exec1",
        correlationId: "corr1",
        jobId: "job1",
        startedAt: new Date().toISOString(),
        status: "running" as const,
        triggerType: "cron" as const,
      };
      const record2 = {
        executionId: "exec2",
        correlationId: "corr1",
        jobId: "job2",
        startedAt: new Date().toISOString(),
        status: "running" as const,
        triggerType: "cron" as const,
      };

      registry.addRecord(record1);
      registry.addRecord(record2);

      const corrList = registry.getRecordsByCorrelationId("corr1");
      expect(corrList).toHaveLength(2);
      expect(corrList.map((r) => r.executionId)).toContain("exec1");
      expect(corrList.map((r) => r.executionId)).toContain("exec2");

      const jobList = registry.getRecordsByJobId("job1");
      expect(jobList).toHaveLength(1);
      expect(jobList[0].executionId).toBe("exec1");
    });
  });

  describe("ExecutionHistoryService", () => {
    it("manages the execution lifecycle and produces summaries", async () => {
      const record = await service.startExecution("job1", "cron", "corr1", "exec1");
      expect(record.status).toBe("running");
      expect(record.correlationId).toBe("corr1");

      await service.recordExport("exec1", "report.csv", "text/csv", 1000, 30);
      await service.recordDelivery("exec1", "email", "completed", 50, "ref123");

      const completed = await service.completeExecution("exec1", 100);
      expect(completed.status).toBe("completed");

      const summary = await service.getSummary("exec1");
      expect(summary.execution.status).toBe("completed");
      expect(summary.export?.filename).toBe("report.csv");
      expect(summary.delivery?.provider).toBe("email");
      expect(summary.metrics.totalDurationMs).toBe(100);
      expect(summary.metrics.exportDurationMs).toBe(30);
      expect(summary.metrics.deliveryDurationMs).toBe(50);
      expect(summary.metrics.executionDurationMs).toBe(20); // 100 - 30 - 50
    });

    it("handles lifecycle failures and records errors", async () => {
      await service.startExecution("job1", "cron", "corr1", "exec1");
      await service.failExecution("exec1", 80, "Timeout Error");

      const summary = await service.getSummary("exec1");
      expect(summary.execution.status).toBe("failed");
      expect(summary.metrics.totalDurationMs).toBe(80);
    });

    it("throws InvalidExecutionStateError if completing a non-running execution", async () => {
      await service.startExecution("job1", "cron", "corr1", "exec1");
      await service.completeExecution("exec1", 50);
      await expect(service.completeExecution("exec1", 50)).rejects.toThrow(InvalidExecutionStateError);
    });

    it("supports concurrent executions", async () => {
      const corr = "corr-concurrent";
      const p1 = service.startExecution("job1", "cron", corr, "exec-c1");
      const p2 = service.startExecution("job2", "cron", corr, "exec-c2");

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.executionId).toBe("exec-c1");
      expect(r2.executionId).toBe("exec-c2");

      const list = await service.queryByCorrelationId(corr);
      expect(list).toHaveLength(2);
    });
  });

  describe("Integration Checks", () => {
    it("JobRunner and JobExecutor register execution and export history", async () => {
      const mockReport = {
        id: "rep123",
        rows: [{ metric: "Active Leads", value: 150 }],
      };

      const mockReportingService = {
        executeReport: async () => mockReport,
      } as unknown as ReportingService;

      const mockExportService = {
        exportDocument: async () => ({
          filename: "mock-report.csv",
          mimeType: "csv",
          content: new Uint8Array([1, 2]),
        }),
      } as unknown as ExportService;

      const executor = new JobExecutor(mockReportingService, mockExportService, service);
      const runner = new JobRunner(executor, undefined, service);

      const job: ScheduledJob = {
        id: "job-runner-test",
        name: "Test Job",
        reportType: "lead-summary",
        format: "csv",
      };

      const result = await runner.runJob(job, "cron", "system");
      expect(result.status).toBe("completed");

      // Verify that the record was created in the registry and contains the export details
      const record = await service.queryByExecutionId(result.executionId);
      expect(record).toBeDefined();
      expect(record?.status).toBe("completed");
      expect(record?.jobId).toBe("job-runner-test");

      const summary = await service.getSummary(result.executionId);
      expect(summary.export).toBeDefined();
      expect(summary.export?.filename).toBe("mock-report.csv");
    });

    it("DeliveryService registers delivery history", async () => {
      const mockExport: ExportResult = {
        filename: "sales-report.csv",
        mimeType: "text/csv",
        content: "mock content",
        generatedAt: new Date().toISOString(),
        sizeBytes: 12,
      };

      const mockRequest: DeliveryRequest = {
        id: "exec-delivery-test",
        exportResult: mockExport,
        providerType: "email",
        context: {
          requestedBy: "manager1",
        },
      };

      const delRegistry = new DeliveryProviderRegistry();
      const mockProvider: DeliveryProvider = {
        deliver: async (req) => ({
          requestId: req.id,
          provider: "email",
          status: "completed" as const,
          deliveredAt: new Date().toISOString(),
          reference: "smtp_ref_123",
        }),
      };
      delRegistry.register("email", mockProvider);

      const delService = new DeliveryService(delRegistry, service);

      // Start execution in history service first
      await service.startExecution("job-delivery", "cron", "corr-delivery", "exec-delivery-test");

      const result = await delService.deliverExport(mockRequest);
      expect(result.status).toBe("completed");

      // Complete execution so summary can be retrieved
      await service.completeExecution("exec-delivery-test", 100);

      // Check delivery record inside history service
      const summary = await service.getSummary("exec-delivery-test");
      expect(summary.delivery).toBeDefined();
      expect(summary.delivery?.provider).toBe("email");
      expect(summary.delivery?.status).toBe("completed");
      expect(summary.delivery?.reference).toBe("smtp_ref_123");
    });
  });
});
