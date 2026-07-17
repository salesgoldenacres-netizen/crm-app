// src/shared/services/reporting/contracts/ReportFilter.ts
export interface ReportFilter {
  readonly field: string;
  readonly operator: string;
  readonly value: unknown;
}
