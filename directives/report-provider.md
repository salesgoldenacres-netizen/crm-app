# Report Provider (Wave 9 Phase 1)

`ReportProvider` abstracts data retrieval scopes:

- Allows swapping memory arrays, local database backups, or live Firestore APIs.
- `FirestoreReportProvider` acts as the concrete implementation, delegating counts directly to `AnalyticsService` so metrics calculations remain unified.
