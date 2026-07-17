// src/shared/services/reporting/contracts/Report.ts
import { ReportFilter } from "./ReportFilter";
import { ReportMetadata } from "./ReportMetadata";

export interface Report<T> {
  readonly id: string;
  readonly title: string;
  readonly generatedAt: Date;
  readonly metadata: ReportMetadata;
  readonly filters: readonly ReportFilter[];
  readonly rows: readonly T[];
}
