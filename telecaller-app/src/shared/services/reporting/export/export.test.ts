import { describe, it, expect } from "vitest";
import { ExportService } from "./ExportService";
import { ExportDriverRegistry } from "./ExportDriverRegistry";
import { FilenameBuilder } from "./FilenameBuilder";
import { CsvDocument } from "./contracts/CsvDocument";
import { SpreadsheetDocument } from "./contracts/SpreadsheetDocument";
import { UnsupportedExportFormatError, ExportValidationError } from "./ExportErrors";

describe("Wave 9 Phase 2 Refined Export Infrastructure", () => {
  const mockCsvDoc: CsvDocument = {
    type: "csv",
    headers: ["Metric", "Value"],
    content: "Metric,Value\nActive Leads,150",
  };

  const mockExcelDoc: SpreadsheetDocument = {
    type: "excel",
    sheets: [
      {
        name: "Test Sheet",
        headers: ["Metric", "Value"],
        rows: [["Active Leads", 150]],
      },
    ],
  };

  describe("FilenameBuilder", () => {
    it("normalizes, sanitizes and appends correct extensions (.xlsx for excel)", () => {
      const csvName = FilenameBuilder.build("Sales Report Title", "csv");
      expect(csvName).toContain("sales-report-title-");
      expect(csvName.endsWith(".csv")).toBe(true);

      const excelName = FilenameBuilder.build("Booking Summary", "excel");
      expect(excelName).toContain("booking-summary-");
      expect(excelName.endsWith(".xlsx")).toBe(true);
    });

    it("handles complex special characters inside report titles gracefully", () => {
      const name = FilenameBuilder.build("A# B$ C% D^ E& F* G()", "csv");
      expect(name).toContain("a-b-c-d-e-f-g");
    });
  });

  describe("ExportDriverRegistry", () => {
    it("resolves registered formatting drivers successfully", () => {
      const registry = new ExportDriverRegistry();
      expect(registry.getDriver("csv")).toBeUndefined();

      const dummyDriver = {} as any;
      registry.register("csv", dummyDriver);
      expect(registry.getDriver("csv")).toBe(dummyDriver);
    });
  });

  describe("ExportService & Drivers", () => {
    it("exports CSV formats and checks UTF-8 byte sizes accurately", async () => {
      const service = new ExportService();
      const result = await service.exportDocument(mockCsvDoc, "csv", "Mock Report");

      expect(result.mimeType).toContain("csv");
      expect(result.filename).toContain("mock-report-");
      expect(result.content).toBe("Metric,Value\nActive Leads,150");
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.generatedAt).toBeTruthy();
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("exports Excel structures as Uint8Array bytes safely", async () => {
      const service = new ExportService();
      const result = await service.exportDocument(mockExcelDoc, "excel", "Mock Excel");

      expect(result.mimeType).toContain("spreadsheet");
      expect(result.filename).toContain("mock-excel-");
      const isUint8 = result.content instanceof Uint8Array ||
        (result.content as any)?.constructor?.name === "Uint8Array" ||
        Object.prototype.toString.call(result.content) === "[object Uint8Array]";
      expect(isUint8).toBe(true);
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("handles empty reports gracefully", async () => {
      const emptyCsv: CsvDocument = { type: "csv", headers: [], content: "" };
      const service = new ExportService();
      const result = await service.exportDocument(emptyCsv, "csv", "Empty Report");
      expect(result.sizeBytes).toBe(0);
    });

    it("handles large datasets without memory overflows", async () => {
      const largeContent = "a,b\n".repeat(10000);
      const largeCsv: CsvDocument = { type: "csv", headers: ["a", "b"], content: largeContent };
      const service = new ExportService();
      const result = await service.exportDocument(largeCsv, "csv", "Large Report");
      expect(result.sizeBytes).toBe(largeContent.length);
    });

    it("handles unicode characters correctly using byte encoders", async () => {
      const unicodeCsv: CsvDocument = { type: "csv", headers: ["Name"], content: "Name\n🌟" };
      const service = new ExportService();
      const result = await service.exportDocument(unicodeCsv, "csv", "Unicode");
      // "🌟" is 4 bytes in UTF-8, "Name\n" is 5 bytes -> total 9 bytes
      expect(result.sizeBytes).toBe(9);
    });

    it("throws errors on validation parameters", async () => {
      const service = new ExportService();
      await expect(service.exportDocument(null as any, "csv", "Title")).rejects.toThrow(
        ExportValidationError
      );
    });

    it("throws error for unsupported formats", async () => {
      const service = new ExportService();
      // @ts-expect-error - testing invalid format
      await expect(service.exportDocument(mockCsvDoc, "pdf", "Title")).rejects.toThrow(
        UnsupportedExportFormatError
      );
    });
  });
});
