// src/shared/services/reporting/export/drivers/ExcelExportDriver.ts
import { ExportDriver } from "../contracts/ExportDriver";
import { ExportDocument } from "../contracts/ExportDocument";
import { ExportResult } from "../contracts/ExportResult";
import { ExportSerializationError } from "../ExportErrors";

export class ExcelExportDriver implements ExportDriver {
  /**
   * Serializes a spreadsheet document into an Excel-compatible output XML representation,
   * preserving worksheet structures, column ordering, and returning binary output (Uint8Array).
   */
  public async export(doc: ExportDocument, filename: string): Promise<Omit<ExportResult, "sizeBytes">> {
    if (doc.type !== "excel") {
      throw new ExportSerializationError("[ExcelExportDriver] Invalid document type. Expected spreadsheet.");
    }

    const simulatedXml = [
      '<?xml version="1.0"?>',
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">',
      doc.sheets.map((sheet) => {
        return [
          `  <Worksheet name="${sheet.name}">`,
          "    <Table>",
          "      <Row>",
          sheet.headers.map((h) => `        <Cell><Data Type="String">${h}</Data></Cell>`).join("\n"),
          "      </Row>",
          sheet.rows.map((row) => {
            return [
              "      <Row>",
              row.map((cell) => {
                const safeVal = cell === null || cell === undefined ? "" : String(cell);
                return `        <Cell><Data Type="String">${safeVal}</Data></Cell>`;
              }).join("\n"),
              "      </Row>",
            ].join("\n");
          }).join("\n"),
          "    </Table>",
          "  </Worksheet>",
        ].join("\n");
      }).join("\n"),
      "</Workbook>",
    ].join("\n");

    const content = new TextEncoder().encode(simulatedXml);

    return Object.freeze({
      filename,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      content,
      generatedAt: new Date().toISOString(),
    });
  }
}
