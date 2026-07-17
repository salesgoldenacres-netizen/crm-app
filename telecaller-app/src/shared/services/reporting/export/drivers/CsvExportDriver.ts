// src/shared/services/reporting/export/drivers/CsvExportDriver.ts
import { ExportDriver } from "../contracts/ExportDriver";
import { ExportDocument } from "../contracts/ExportDocument";
import { ExportResult } from "../contracts/ExportResult";
import { ExportSerializationError } from "../ExportErrors";

export class CsvExportDriver implements ExportDriver {
  public async export(doc: ExportDocument, filename: string): Promise<Omit<ExportResult, "sizeBytes">> {
    if (doc.type !== "csv") {
      throw new ExportSerializationError("[CsvExportDriver] Invalid document type. Expected CSV.");
    }

    return Object.freeze({
      filename,
      mimeType: "text/csv;charset=utf-8;",
      content: doc.content,
      generatedAt: new Date().toISOString(),
    });
  }
}
