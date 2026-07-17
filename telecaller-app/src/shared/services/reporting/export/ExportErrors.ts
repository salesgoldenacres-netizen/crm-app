// src/shared/services/reporting/export/ExportErrors.ts
export class ExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportError";
  }
}

export class UnsupportedExportFormatError extends ExportError {}
export class ExportSerializationError extends ExportError {}
export class ExportValidationError extends ExportError {}
