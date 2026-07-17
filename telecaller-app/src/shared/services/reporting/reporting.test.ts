import { describe, it, expect } from "vitest";
import { ReportBuilder } from "./ReportBuilder";
import { ReportFormatter } from "./ReportFormatter";
import { ReportingService } from "./ReportingService";
import { FirestoreReportProvider } from "./providers/FirestoreReportProvider";
import { ReportRequest } from "./contracts/ReportRequest";
import { AnalyticsService } from "@/shared/services/analytics/AnalyticsService";
import { AuthorizationService } from "@/shared/services/authorizationService";
import { User } from "@/shared/types";

describe("Wave 9 Phase 1 Reporting Infrastructure", () => {
  const mockUser: User = {
    id: "user1",
    uid: "user1",
    role: "manager",
  } as unknown as User;

  const mockAnalytics = {
    getPipelineMetrics: async () => ({ totalCount: 150 }),
    getBookingMetrics: async () => ({ totalBookings: 15 }),
  } as unknown as unknown as AnalyticsService;

  const mockAuth = {
    isProjectAuthorized: (_user: User | null, projId?: string) => projId === "allowed_project",
  } as unknown as typeof AuthorizationService;

  describe("ReportBuilder", () => {
    it("normalizes and produces an immutable report structure", () => {
      const request: ReportRequest = {
        reportType: "lead-summary",
        generatedBy: "manager1",
        projectId: "proj1",
      };

      const report = ReportBuilder.buildReport("id1", "Lead Report", request, [{ metric: "a", value: 10 }], 15);

      expect(report.id).toBe("id1");
      expect(report.title).toBe("Lead Report");
      expect(report.rows).toHaveLength(1);
      expect(Object.isFrozen(report)).toBe(true);
      expect(Object.isFrozen(report.metadata)).toBe(true);
      expect(Object.isFrozen(report.rows)).toBe(true);
    });
  });

  describe("ReportFormatter", () => {
    it("formats report contents into structural CSV representations", () => {
      const request: ReportRequest = {
        reportType: "lead-summary",
        generatedBy: "manager1",
      };
      const report = ReportBuilder.buildReport("id1", "Lead Report", request, [{ metric: "a", value: 10 }], 15);

      const csv = ReportFormatter.toCSV(report, ["Metric", "Value"], (row) => [row.metric, String(row.value)]);

      expect(csv.headers).toEqual(["Metric", "Value"]);
      expect(csv.content).toBe("Metric,Value\na,10");
    });
  });

  describe("ReportingService & FirestoreReportProvider", () => {
    it("respects project scope limits and generates summary metrics successfully", async () => {
      const provider = new FirestoreReportProvider(mockAnalytics);
      const service = new ReportingService(provider, mockAuth, mockUser);

      const request: ReportRequest = {
        reportType: "lead-summary",
        generatedBy: "manager1",
        projectId: "allowed_project",
      };

      const report = await service.executeReport(request);
      expect(report.title).toContain("allowed_project");
      expect(report.rows[0]).toEqual({ metric: "Active Leads", value: 150 });
    });

    it("rejects unauthorized project scopes", async () => {
      const provider = new FirestoreReportProvider(mockAnalytics);
      const service = new ReportingService(provider, mockAuth, mockUser);

      const request: ReportRequest = {
        reportType: "lead-summary",
        generatedBy: "manager1",
        projectId: "unauthorized_project",
      };

      await expect(service.executeReport(request)).rejects.toThrow("Unauthorized to access project");
    });
  });
});
