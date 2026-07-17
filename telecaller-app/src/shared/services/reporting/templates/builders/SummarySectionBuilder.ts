// src/shared/services/reporting/templates/builders/SummarySectionBuilder.ts
import { SectionBuilder, SectionBuildRequest, BuilderMetadata } from "../contracts/SectionBuilder";
import { ReportSection } from "../contracts/ReportSection";

export interface SummaryConfiguration {
  readonly includeAverage: boolean;
}

export class SummarySectionBuilder implements SectionBuilder<SummaryConfiguration> {
  public readonly metadata: BuilderMetadata = {
    id: "SummarySectionBuilder",
    version: "1.0.0",
    supportedSectionTypes: ["summary"],
    dependsOn: [],
    produces: "summary-block",
    consumes: [],
    supportsParallelExecution: true,
    supportsCaching: true,
  };

  public async build(request: SectionBuildRequest<SummaryConfiguration>): Promise<ReportSection> {
    const start = performance.now();
    
    let sum = 0;
    let count = 0;
    const values = request.report.rows
      .map((row: any) => row.value)
      .filter((v) => typeof v === "number" && !isNaN(v));

    if (values.length > 0) {
      sum = values.reduce((acc, v) => acc + v, 0);
      count = values.length;
    }

    const content = {
      totalCount: request.report.rows.length,
      numericObservationsCount: count,
      sum,
      average: request.configuration.includeAverage && count > 0 ? sum / count : undefined,
    };

    const section: ReportSection = {
      id: "summary",
      type: "summary",
      title: "Executive Summary",
      content,
      metadata: {
        order: 1,
        visible: true,
        generatedAt: new Date().toISOString(),
        builderId: this.metadata.id,
        builderVersion: this.metadata.version,
        executionDurationMs: performance.now() - start,
        warnings: [],
      },
    };

    return Object.freeze(section);
  }
}
