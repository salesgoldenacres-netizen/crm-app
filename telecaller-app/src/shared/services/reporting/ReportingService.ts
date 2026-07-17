// src/shared/services/reporting/ReportingService.ts
import { Report } from "./contracts/Report";
import { ReportProvider } from "./contracts/ReportProvider";
import { ReportRequest } from "./contracts/ReportRequest";
import { AuthorizationService } from "@/shared/services/authorizationService";
import { User } from "@/shared/types";

export class ReportingService {
  constructor(
    private readonly provider: ReportProvider,
    private readonly authService: typeof AuthorizationService,
    private readonly currentUser: User | null
  ) {}

  /**
   * Orchestrates report checks, scoping parameters, and validation steps.
   */
  public async executeReport(request: ReportRequest): Promise<Report<unknown>> {
    // 1. Authorization checks
    if (!this.currentUser) {
      throw new Error("[ReportingService] User must be authenticated to generate reports.");
    }

    if (request.projectId) {
      const authorized = this.authService.isProjectAuthorized(this.currentUser, request.projectId);
      if (!authorized) {
        throw new Error(`[ReportingService] Unauthorized to access project: ${request.projectId}`);
      }
    }

    // 2. Validate request limits
    if (!request.reportType) {
      throw new Error("[ReportingService] Report request type must be specified.");
    }

    // 3. Delegate execution directly to the stateless provider
    return this.provider.generateReport(request);
  }
}
