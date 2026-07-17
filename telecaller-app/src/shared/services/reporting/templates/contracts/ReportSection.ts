// src/shared/services/reporting/templates/contracts/ReportSection.ts
import { ReportSectionType } from "./ReportSectionType";

export interface ReportSection {
  readonly id: string;
  readonly type: ReportSectionType;
  readonly title: string;
  readonly content: unknown;
  readonly metadata: {
    readonly order: number;
    readonly visible: boolean;
    readonly generatedAt: string;
    readonly builderId: string;
    readonly builderVersion: string;
    readonly executionDurationMs: number;
    readonly warnings: readonly string[];
  };
}
