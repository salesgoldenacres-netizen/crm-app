// src/shared/services/reporting/export/contracts/SpreadsheetDocument.ts
export interface SpreadsheetDocument {
  readonly type: "excel";
  readonly sheets: readonly {
    readonly name: string;
    readonly headers: readonly string[];
    readonly rows: readonly (readonly (string | number | boolean | null)[])[];
  }[];
}
