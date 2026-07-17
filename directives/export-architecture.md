# Export Architecture (Wave 9 Phase 2 Refined)

This document diagrams the modular layout of the reporting export system:

```text
Report ──> ReportFormatter ──> Document Models (CsvDocument / SpreadsheetDocument)
                                                    │
                                                    ▼
                                              ExportService
                                                    │
                                                    ▼
                                           ExportDriverRegistry
                                                    │
                                           ┌────────┴────────┐
                                           ▼                 ▼
                                    CsvExportDriver   ExcelExportDriver
                                           │
                                           ▼
                                      ExportResult
```

- **ExportService**: Coordinates formatting and execution, calculating size metrics platform-neutrally.
- **ExportDriver**: Serialization boundary converting documents without accessing raw formatting steps.
- **ExportDriverRegistry**: Singleton registry lifecycle managing runtime format drivers.
- **FilenameBuilder**: Standardized title sanitization mapping formats with type safety.
