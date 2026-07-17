// src/shared/services/reporting/templates/contracts/SectionBuilder.ts
import { Report } from "../../contracts/Report";
import { CompositionContext } from "./CompositionContext";
import { ReportSection } from "./ReportSection";
import { ReportSectionType } from "./ReportSectionType";

export interface SectionBuildRequest<TConfig = any> {
  readonly report: Report<unknown>;
  readonly context: CompositionContext;
  readonly configuration: TConfig;
}

export interface BuilderMetadata {
  readonly id: string;
  readonly version: string;
  readonly supportedSectionTypes: readonly ReportSectionType[];
  readonly dependsOn: readonly ReportSectionType[];
  readonly produces: string;
  readonly consumes: readonly string[];
  readonly supportsParallelExecution: boolean;
  readonly supportsCaching: boolean;
  readonly deprecated?: boolean;
  readonly experimental?: boolean;
}

export interface SectionBuilder<TConfig = any> {
  readonly metadata: BuilderMetadata;
  build(request: SectionBuildRequest<TConfig>): Promise<ReportSection>;
}
