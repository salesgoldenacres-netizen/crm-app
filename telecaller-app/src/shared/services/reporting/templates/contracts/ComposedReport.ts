// src/shared/services/reporting/templates/contracts/ComposedReport.ts
import { CompositionManifest } from "./CompositionManifest";
import { ReportSection } from "./ReportSection";
import { BrandingConfiguration } from "./BrandingConfiguration";
import { LocalizationConfiguration } from "./LocalizationConfiguration";

export interface ComposedReport {
  readonly id: string;
  readonly templateId: string;
  readonly manifest: CompositionManifest;
  readonly branding: BrandingConfiguration;
  readonly localization: LocalizationConfiguration;
  readonly sections: readonly ReportSection[];
  readonly generatedAt: string;
}
