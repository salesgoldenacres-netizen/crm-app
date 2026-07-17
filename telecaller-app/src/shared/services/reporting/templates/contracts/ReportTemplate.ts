// src/shared/services/reporting/templates/contracts/ReportTemplate.ts
import { ReportSectionType } from "./ReportSectionType";

export interface TemplateSection {
  readonly id: string;
  readonly type: ReportSectionType;
  readonly enabled: boolean;
  readonly configuration?: any;
}

export interface ReportTemplate {
  readonly templateId: string;
  readonly version: string;
  readonly displayName: string;
  readonly supportedReportTypes: readonly string[];
  readonly sections: readonly TemplateSection[];
}
