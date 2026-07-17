// src/shared/services/reporting/export/ExportService.ts
import { ExportFormat } from "./contracts/ExportFormat";
import { ExportDocument } from "./contracts/ExportDocument";
import { ExportResult } from "./contracts/ExportResult";
import registry, { ExportDriverRegistry } from "./ExportDriverRegistry";
import { FilenameBuilder } from "./FilenameBuilder";
import { UnsupportedExportFormatError, ExportValidationError } from "./ExportErrors";

export class ExportService {
  constructor(private readonly registryMap: ExportDriverRegistry = registry) {}

  /**
   * Transforms immutable document models into ExportResult files,
   * calculating the exact byte size using platform-neutral text/binary encoders.
   */
  public async exportDocument(
    doc: ExportDocument,
    format: ExportFormat,
    reportTitle: string
  ): Promise<ExportResult> {
    if (!doc) {
      throw new ExportValidationError("[ExportService] Document parameter must be supplied.");
    }
    if (!reportTitle) {
      throw new ExportValidationError("[ExportService] Report title must be specified.");
    }

    const driver = this.registryMap.getDriver(format);
    if (!driver) {
      throw new UnsupportedExportFormatError(`[ExportService] Unsupported format type requested: ${format}`);
    }

    const filename = FilenameBuilder.build(reportTitle, format);
    const intermediate = await driver.export(doc, filename);

    // Platform-neutral byte size calculation
    const sizeBytes =
      typeof intermediate.content === "string"
        ? new TextEncoder().encode(intermediate.content).length
        : intermediate.content.byteLength;

    return Object.freeze({
      ...intermediate,
      sizeBytes,
    });
  }
}

export const exportService = new ExportService();
