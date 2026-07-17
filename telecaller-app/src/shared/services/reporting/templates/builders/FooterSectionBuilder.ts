// src/shared/services/reporting/templates/builders/FooterSectionBuilder.ts
import { SectionBuilder, SectionBuildRequest, BuilderMetadata } from "../contracts/SectionBuilder";
import { ReportSection } from "../contracts/ReportSection";

export interface FooterConfiguration {
  readonly includeSignatureLine: boolean;
}

export class FooterSectionBuilder implements SectionBuilder<FooterConfiguration> {
  public readonly metadata: BuilderMetadata = {
    id: "FooterSectionBuilder",
    version: "1.0.0",
    supportedSectionTypes: ["footer"],
    dependsOn: [],
    produces: "footer-block",
    consumes: [],
    supportsParallelExecution: true,
    supportsCaching: true,
  };

  public async build(request: SectionBuildRequest<FooterConfiguration>): Promise<ReportSection> {
    const start = performance.now();
    const branding = request.context.branding;
    
    const content = {
      footerText: branding.footerText,
      generatedAt: request.context.generatedAt,
      generatedBy: request.context.generatedBy,
      includeSignatureLine: request.configuration.includeSignatureLine,
    };

    const section: ReportSection = {
      id: "footer",
      type: "footer",
      title: "Footer & Signature",
      content,
      metadata: {
        order: 4,
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
