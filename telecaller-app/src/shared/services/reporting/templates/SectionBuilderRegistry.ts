// src/shared/services/reporting/templates/SectionBuilderRegistry.ts
import { SectionBuilder } from "./contracts/SectionBuilder";
import { ReportSectionType } from "./contracts/ReportSectionType";
import { HeaderSectionBuilder } from "./builders/HeaderSectionBuilder";
import { SummarySectionBuilder } from "./builders/SummarySectionBuilder";
import { MetricsSectionBuilder } from "./builders/MetricsSectionBuilder";
import { ForecastSectionBuilder } from "./builders/ForecastSectionBuilder";
import { FooterSectionBuilder } from "./builders/FooterSectionBuilder";

export class SectionBuilderRegistry {
  private builders = new Map<ReportSectionType, SectionBuilder>();

  public register(type: ReportSectionType, builder: SectionBuilder): void {
    if (this.builders.has(type)) {
      throw new Error(`[SectionBuilderRegistry] Builder for type ${type} is already registered.`);
    }
    this.builders.set(type, builder);
  }

  public getBuilder(type: ReportSectionType): SectionBuilder | undefined {
    return this.builders.get(type);
  }

  public clear(): void {
    this.builders.clear();
  }
}

const defaultBuilderRegistry = new SectionBuilderRegistry();
defaultBuilderRegistry.register("header", new HeaderSectionBuilder());
defaultBuilderRegistry.register("summary", new SummarySectionBuilder());
defaultBuilderRegistry.register("metrics", new MetricsSectionBuilder());
defaultBuilderRegistry.register("forecast", new ForecastSectionBuilder());
defaultBuilderRegistry.register("footer", new FooterSectionBuilder());

export default defaultBuilderRegistry;
export { defaultBuilderRegistry as sectionBuilderRegistry };
