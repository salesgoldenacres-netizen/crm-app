// src/shared/services/reporting/contracts/ReportRequest.ts
import { ReportFilter } from "./ReportFilter";

export interface ReportRequest {
  readonly projectId?: string;
  readonly dateRange?: { start: Date; end: Date };
  readonly filters?: readonly ReportFilter[];
  readonly sorting?: string;
  readonly grouping?: string;
  readonly reportType: "lead-summary" | "booking" | "team-performance" | "source-performance" | "conversion-funnel";
  readonly generatedBy: string;
}
