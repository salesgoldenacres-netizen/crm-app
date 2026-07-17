// src/shared/services/reporting/export/contracts/ExportDocument.ts
import { CsvDocument } from "./CsvDocument";
import { SpreadsheetDocument } from "./SpreadsheetDocument";

export type ExportDocument = CsvDocument | SpreadsheetDocument;
