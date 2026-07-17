// src/shared/services/reporting/export/contracts/CsvDocument.ts
export interface CsvDocument {
  readonly type: "csv";
  readonly headers: readonly string[];
  readonly content: string;
}
