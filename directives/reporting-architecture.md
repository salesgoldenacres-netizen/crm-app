# Reporting Architecture (Wave 9 Phase 1)

This document diagrams the modular layout of the reporting foundation:

```text
ReportingService ──> ReportProvider ──> AnalyticsService ──> Firestore
```

- **ReportingService**: Evaluates allowed project scopes and handles parameter validations.
- **ReportProvider**: Abstract storage interface.
- **FirestoreReportProvider**: Implements provider fetching using the centralized AnalyticsService metrics.
- **ReportBuilder**: Formulates read-only frozen report objects.
- **ReportFormatter**: Normalizes records into export models (CSV/Spreadsheet).
