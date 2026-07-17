# Execution History

Execution history acts as the central observability and audit ledger for report runs in the Golden Acres CRM Reporting Subsystem.

## Responsibilities
- Track report run state changes (pending -> running -> completed/failed).
- Capture execution identifiers (jobId, executionId, correlationId).
- Enforce immutability boundaries on execution summaries once finalized.
- Provide registry-based lookup functions for querying executions.
