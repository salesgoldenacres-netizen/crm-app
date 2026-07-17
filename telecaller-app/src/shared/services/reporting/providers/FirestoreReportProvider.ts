// src/shared/services/reporting/providers/FirestoreReportProvider.ts
import { Report } from "../contracts/Report";
import { ReportProvider } from "../contracts/ReportProvider";
import { ReportRequest } from "../contracts/ReportRequest";
import { ReportBuilder } from "../ReportBuilder";
import { AnalyticsService } from "@/shared/services/analytics/AnalyticsService";

export class FirestoreReportProvider implements ReportProvider {
  constructor(private readonly analyticsService: AnalyticsService) {}

  public async generateReport(request: ReportRequest): Promise<Report<unknown>> {
    const start = performance.now();
    let title = "CRM Report";
    let rows: unknown[];

    // Respect project boundaries and delegate statistical sums to AnalyticsService
    const projectId = request.projectId || "all";

    switch (request.reportType) {
      case "lead-summary": {
        title = `Lead Summary Report - Project: ${projectId}`;
        const pipeline = await this.analyticsService.getPipelineMetrics(request.projectId);
        rows = [{ metric: "Active Leads", value: pipeline.totalCount }];
        break;
      }
      case "booking": {
        title = `Booking Report - Project: ${projectId}`;
        const bookings = await this.analyticsService.getBookingMetrics(request.projectId);
        rows = [{ metric: "Bookings Today", value: bookings.totalBookings }];
        break;
      }
      default:
        rows = [];
    }

    const duration = performance.now() - start;
    const reportId = `report_${Date.now()}`;

    return ReportBuilder.buildReport(reportId, title, request, rows, duration);
  }
}
