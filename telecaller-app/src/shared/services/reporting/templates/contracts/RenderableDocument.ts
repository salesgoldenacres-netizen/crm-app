// src/shared/services/reporting/templates/contracts/RenderableDocument.ts
import { ReportSection } from "./ReportSection";
import { BrandingConfiguration } from "./BrandingConfiguration";
import { LocalizationConfiguration } from "./LocalizationConfiguration";

export interface RenderableDocument {
  readonly id: string;
  readonly metadata: Record<string, any>;
  readonly sections: readonly ReportSection[];
  readonly branding: BrandingConfiguration;
  readonly localization: LocalizationConfiguration;
}
