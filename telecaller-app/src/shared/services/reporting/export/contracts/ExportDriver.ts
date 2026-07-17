// src/shared/services/reporting/export/contracts/ExportDriver.ts
import { ExportDocument } from "./ExportDocument";
import { ExportResult } from "./ExportResult";

export interface ExportDriver {
  export(doc: ExportDocument, filename: string): Promise<Omit<ExportResult, "sizeBytes">>;
}
