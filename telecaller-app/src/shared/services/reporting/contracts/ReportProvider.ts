// src/shared/services/reporting/contracts/ReportProvider.ts
import { Report } from "./Report";
import { ReportRequest } from "./ReportRequest";

export interface ReportProvider {
  generateReport(request: ReportRequest): Promise<Report<unknown>>;
}
