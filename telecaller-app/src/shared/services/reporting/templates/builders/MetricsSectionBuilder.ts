// src/shared/services/reporting/templates/builders/MetricsSectionBuilder.ts
import { SectionBuilder, SectionBuildRequest, BuilderMetadata } from "../contracts/SectionBuilder";
import { ReportSection } from "../contracts/ReportSection";

export interface MetricsConfiguration {
  readonly maxRows: number;
}

export class MetricsSectionBuilder implements SectionBuilder<MetricsConfiguration> {
  public readonly metadata: BuilderMetadata = {
    id: "MetricsSectionBuilder",
    version: "1.0.0",
    supportedSectionTypes: ["metrics"],
    dependsOn: [],
    produces: "metrics-block",
    consumes: [],
    supportsParallelExecution: true,
    supportsCaching: true,
  };

  public async build(request: SectionBuildRequest<MetricsConfiguration>): Promise<ReportSection> {
    const start = performance.now();
    const limit = request.configuration.maxRows || 100;
    
    const rows = request.report.rows.slice(0, limit);
    const content = {
      totalRows: request.report.rows.length,
      displayedRows: rows.length,
      rows,
    };

    const section: ReportSection = {
      id: "metrics",
      type: "metrics",
      title: "Detailed Metrics Data",
      content,
      metadata: {
        order: 2,
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
