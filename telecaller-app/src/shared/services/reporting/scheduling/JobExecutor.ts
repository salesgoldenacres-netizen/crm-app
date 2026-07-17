// src/shared/services/reporting/scheduling/JobExecutor.ts
import { ScheduledJob } from "./contracts/ScheduledJob";
import { ReportingService } from "../ReportingService";
import { ExportService } from "../export/ExportService";
import { ReportRequest } from "../contracts/ReportRequest";
import { CsvDocument } from "../export/contracts/CsvDocument";
import { SpreadsheetDocument } from "../export/contracts/SpreadsheetDocument";
import { JobExecutionResult } from "./contracts/JobExecutionResult";
import { JobExecutionError } from "./SchedulingErrors";
import { executionHistoryService, ExecutionHistoryService } from "../history/ExecutionHistoryService";

export class JobExecutor {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly exportService: ExportService,
    private readonly historyService: ExecutionHistoryService = executionHistoryService
  ) {}

  /**
   * Executes report requests and formats document models, coordinating ReportingService and ExportService.
   */
  public async executeJob(job: ScheduledJob, executionId: string, generatedBy: string): Promise<JobExecutionResult> {
    const start = performance.now();
    try {
      const request: ReportRequest = {
        reportType: job.reportType,
        generatedBy,
        projectId: job.projectId,
      };

      // 1. Fetch raw report rows
      const report = await this.reportingService.executeReport(request);

      // 2. Wrap into appropriate document models
      let doc: CsvDocument | SpreadsheetDocument;
      if (job.format === "csv") {
        doc = {
          type: "csv",
          headers: ["Metric", "Value"],
          content: report.rows.map((r: any) => `${r.metric},${r.value}`).join("\n"),
        };
      } else {
        doc = {
          type: "excel",
          sheets: [
            {
              name: "Sheet1",
              headers: ["Metric", "Value"],
              rows: report.rows.map((r: any) => [r.metric, r.value]),
            },
          ],
        };
      }

      // 3. Serialize output
      const exportStart = performance.now();
      const result = await this.exportService.exportDocument(doc, job.format, job.name);
      const exportDurationMs = performance.now() - exportStart;

      // Publish export details to ExecutionHistoryService
      try {
        await this.historyService.recordExport(
          executionId,
          result.filename,
          result.mimeType,
          result.content.length,
          exportDurationMs
        );
      } catch {
        // Safe fallback if history start was not called/failed (e.g. in older unit tests)
      }

      const durationMs = performance.now() - start;

      return Object.freeze({
        executionId,
        status: "completed" as const,
        reportId: report.id,
        exportFilename: result.filename,
        durationMs,
      });
    } catch (err: any) {
      throw new JobExecutionError(`[JobExecutor] Execution failed for job ${job.id}: ${err.message}`);
    }
  }
}

