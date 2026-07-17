// src/shared/services/reporting/templates/builders/ForecastSectionBuilder.ts
import { SectionBuilder, SectionBuildRequest, BuilderMetadata } from "../contracts/SectionBuilder";
import { ReportSection } from "../contracts/ReportSection";
import { forecastService } from "../../forecasting/ForecastService";
import { SectionBuildError } from "../TemplateErrors";

export interface ForecastSectionConfiguration {
  readonly strategyName: string;
  readonly horizon: number;
}

export class ForecastSectionBuilder implements SectionBuilder<ForecastSectionConfiguration> {
  public readonly metadata: BuilderMetadata = {
    id: "ForecastSectionBuilder",
    version: "1.0.0",
    supportedSectionTypes: ["forecast"],
    dependsOn: ["metrics"],
    produces: "forecast-block",
    consumes: ["metrics-block"],
    supportsParallelExecution: false,
    supportsCaching: true,
  };

  public async build(request: SectionBuildRequest<ForecastSectionConfiguration>): Promise<ReportSection> {
    const start = performance.now();
    const config = request.configuration;
    
    try {
      const forecastResult = await forecastService.forecastReport(
        request.report,
        config.strategyName || "Moving Average Forecast Strategy",
        "monthly",
        config.horizon || 3
      );

      const section: ReportSection = {
        id: "forecast",
        type: "forecast",
        title: `Forecast Results (${config.strategyName || "Moving Average"})`,
        content: forecastResult,
        metadata: {
          order: 3,
          visible: true,
          generatedAt: new Date().toISOString(),
          builderId: this.metadata.id,
          builderVersion: this.metadata.version,
          executionDurationMs: performance.now() - start,
          warnings: [],
        },
      };

      return Object.freeze(section);
    } catch (err: any) {
      throw new SectionBuildError(`[ForecastSectionBuilder] Forecast calculation failed: ${err.message}`, { cause: err });
    }
  }
}
