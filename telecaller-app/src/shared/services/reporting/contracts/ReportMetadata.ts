// src/shared/services/reporting/contracts/ReportMetadata.ts
export interface ReportMetadata {
  readonly reportType: string;
  readonly projectId?: string;
  readonly generatedBy: string;
  readonly generationDurationMs: number;
  readonly rowCount: number;
  readonly version: number;
}
