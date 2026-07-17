// src/shared/services/reporting/dataset/contracts/DatasetContext.ts
export interface DatasetContext {
  readonly reportParameters: Record<string, unknown>;
  readonly localization: {
    readonly locale: string;
    readonly timezone: string;
    readonly dateFormat: string;
    readonly numberFormat: string;
  };
  readonly executionId: string;
  readonly correlationId: string;
  readonly generatedBy: string;
  readonly cancellationToken?: { readonly isCancelled: boolean };
}
