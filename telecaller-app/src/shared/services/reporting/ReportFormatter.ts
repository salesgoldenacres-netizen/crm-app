// src/shared/services/reporting/ReportFormatter.ts
import { Report } from "./contracts/Report";

export interface FormattedCSV {
  readonly headers: readonly string[];
  readonly content: string;
}

export interface FormattedSpreadsheet {
  readonly sheets: readonly {
    readonly name: string;
    readonly headers: readonly string[];
    readonly rows: readonly (readonly (string | number | boolean | null)[])[];
  }[];
}

export class ReportFormatter {
  /**
   * Formats report into structural CSV data models.
   */
  public static toCSV<T>(report: Report<T>, headers: string[], extractRow: (row: T) => string[]): FormattedCSV {
    const csvLines = [headers.join(",")];
    report.rows.forEach((row) => {
      csvLines.push(extractRow(row).join(","));
    });

    return Object.freeze({
      headers: Object.freeze([...headers]),
      content: csvLines.join("\n"),
    });
  }

  /**
   * Formats report into standard spreadsheet models.
   */
  public static toSpreadsheet<T>(
    report: Report<T>,
    sheetName: string,
    headers: string[],
    extractRow: (row: T) => (string | number | boolean | null)[]
  ): FormattedSpreadsheet {
    const rows = report.rows.map((row) => Object.freeze(extractRow(row)));
    return Object.freeze({
      sheets: [
        Object.freeze({
          name: sheetName,
          headers: Object.freeze([...headers]),
          rows: Object.freeze(rows),
        }),
      ],
    });
  }
}
