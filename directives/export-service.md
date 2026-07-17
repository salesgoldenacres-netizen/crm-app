# Export Service (Wave 9 Phase 2 Refined)

`ExportService` Coordinates export formatting:

- Receives a formatted `ExportDocument` model.
- Resolves registry drivers.
- Performs platform-neutral size calculations (`TextEncoder` and byte lengths).
- Returns the immutable, serialization-friendly `ExportResult`.
