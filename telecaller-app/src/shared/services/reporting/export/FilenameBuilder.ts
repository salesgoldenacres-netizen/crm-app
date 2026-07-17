// src/shared/services/reporting/export/FilenameBuilder.ts
import { ExportFormat } from "./contracts/ExportFormat";

export class FilenameBuilder {
  /**
   * Builds normalized filenames using the correct modern Excel extension (.xlsx).
   */
  public static build(title: string, format: ExportFormat): string {
    const sanitized = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    
    // Use ISO short date safely
    const dateStr = new Date().toISOString().split("T")[0];
    const ext = format === "excel" ? "xlsx" : format;
    return `${sanitized}-${dateStr}.${ext}`;
  }
}
