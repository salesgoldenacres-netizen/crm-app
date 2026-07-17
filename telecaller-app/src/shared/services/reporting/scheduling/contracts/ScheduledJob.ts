// src/shared/services/reporting/scheduling/contracts/ScheduledJob.ts
import { ExportFormat } from "../../export/contracts/ExportFormat";

export type ReportType = "lead-summary" | "booking";

export interface ScheduledJob {
  readonly id: string;
  readonly name: string;
  readonly reportType: ReportType;
  readonly projectId?: string;
  readonly format: ExportFormat;
}
