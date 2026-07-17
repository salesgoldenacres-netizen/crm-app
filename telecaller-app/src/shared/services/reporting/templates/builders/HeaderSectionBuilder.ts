// src/shared/services/reporting/templates/builders/HeaderSectionBuilder.ts
import { SectionBuilder, SectionBuildRequest, BuilderMetadata } from "../contracts/SectionBuilder";
import { ReportSection } from "../contracts/ReportSection";

export interface HeaderConfiguration {
  readonly showMetadata: boolean;
}

export class HeaderSectionBuilder implements SectionBuilder<HeaderConfiguration> {
  public readonly metadata: BuilderMetadata = {
    id: "HeaderSectionBuilder",
    version: "1.0.0",
    supportedSectionTypes: ["header"],
    dependsOn: [],
    produces: "header-block",
    consumes: [],
    supportsParallelExecution: true,
    supportsCaching: true,
  };

  public async build(request: SectionBuildRequest<HeaderConfiguration>): Promise<ReportSection> {
    const start = performance.now();
    const branding = request.context.branding;
    
    const content = {
      title: request.report.title,
      logo: branding.logo || "",
      companyName: branding.companyName,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      reportMetadata: request.configuration.showMetadata ? {
        reportId: request.report.id,
        generatedAt: typeof request.report.generatedAt === "string" ? request.report.generatedAt : new Date(request.report.generatedAt).toISOString(),
        createdBy: request.report.metadata?.createdBy || "system",
      } : undefined,
    };

    const section: ReportSection = {
      id: "header",
      type: "header",
      title: "Header Block",
      content,
      metadata: {
        order: 0,
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
