// src/shared/services/reporting/export/contracts/ExportResult.ts
export interface ExportResult {
  readonly filename: string;
  readonly mimeType: string;
  readonly content: string | Uint8Array;
  readonly generatedAt: string; // ISO-8601
  readonly sizeBytes: number;
}
