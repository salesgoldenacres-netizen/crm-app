// src/shared/services/reporting/ReportBuilder.ts
import { Report } from "./contracts/Report";
import { ReportRequest } from "./contracts/ReportRequest";
import { ReportMetadata } from "./contracts/ReportMetadata";

export class ReportBuilder {
  /**
   * Transforms items and normalized details into an immutable Report model.
   * Pure TypeScript module containing no React or database imports.
   */
  public static buildReport<T>(
    id: string,
    title: string,
    request: ReportRequest,
    rows: T[],
    durationMs: number
  ): Report<T> {
    const metadata: ReportMetadata = {
      reportType: request.reportType,
      projectId: request.projectId,
      generatedBy: request.generatedBy,
      generationDurationMs: durationMs,
      rowCount: rows.length,
      version: 1,
    };

    return Object.freeze({
      id,
      title,
      generatedAt: new Date(),
      metadata: Object.freeze(metadata),
      filters: Object.freeze(request.filters ? [...request.filters] : []),
      rows: Object.freeze([...rows]),
    });
  }
}
