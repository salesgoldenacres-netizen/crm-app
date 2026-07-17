// src/shared/services/reporting/templates/SectionBuilderProvider.ts
import { SectionBuilderRegistry, sectionBuilderRegistry } from "./SectionBuilderRegistry";
import { SectionBuilder } from "./contracts/SectionBuilder";
import { ReportSectionType } from "./contracts/ReportSectionType";

export class SectionBuilderProvider {
  constructor(private readonly registry: SectionBuilderRegistry = sectionBuilderRegistry) {}

  public resolve(type: ReportSectionType): SectionBuilder {
    const builder = this.registry.getBuilder(type);
    if (!builder) {
      throw new Error(`[SectionBuilderProvider] SectionBuilder for type ${type} could not be resolved.`);
    }
    return builder;
  }
}
