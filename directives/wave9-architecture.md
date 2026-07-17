# Wave 9 — Canonical Reporting & Export Architecture

This document serves as the canonical reference for the Golden Acres CRM Reporting and Export Subsystem.

## 1. Subsystem Architecture

The reporting and export subsystem is structured in cleanly isolated layers to ensure platform independence, extensibility, and maintainability:

```text
Analytics Engine (AnalyticsService)
             │
             ▼
Reporting Core (ReportingService -> ReportBuilder)
             │
             ▼
Formatting & Normalization (ReportFormatter)
             │
             ▼
Document Models (CsvDocument / SpreadsheetDocument)
             │
             ▼
Export Pipeline (ExportService -> ExportDriverRegistry)
             │
             ▼
Delivery Channels (Future: email, cloud storage, notifications)
             │
             ▼
Observability & Telemetry (ExecutionHistoryService -> ExecutionHistoryRegistry)
```

## 2. Layer Responsibilities

- **Analytics Engine**: The single source of truth for raw metric counts, goal tracking, and pipelines.
- **Reporting Core**: Validates user authorization scopes and constructs read-only frozen report envelopes.
- **Formatting**: Normalizes report row records into structured schemas (CSV rows, spreadsheet sheets).
- **Document Models**: Immutable, serializable contracts separating formatting from serialization.
- **Export Pipeline**: Directs format keys to registered drivers, sanitizes filenames, and calculates file size platform-neutrally.
- **Observability**: Tracks immutable execution history, correlation traces, and timing metrics across execution steps.

## 3. Dependency Rules

1. **Top-Down Flow Only**: Higher layers may import from lower layers; lower layers must never import or depend on higher layers. For example, `ScheduleService` may call `JobRunner`, but `JobRunner` must never depend on or import `ScheduleService`.
2. **Platform Neutrality**: No browser-specific APIs (like `Blob` or `window`) or Node-specific APIs (like `fs`) are permitted in core services or drivers.
3. **No React/UI Imports**: Subsystem files must remain pure TypeScript modules to facilitate future execution in serverless background cron workers.
4. **Single Responsibility Rule**:
   - `ReportingService` produces reports.
   - `ReportFormatter` formats reports.
   - `ExportService` serializes documents.
   - `JobRunner` executes jobs.
   - `ScheduleService` coordinates schedules.
   - Trigger implementations only initiate execution.
   - `DeliveryService` orchestrates file exports delivery.
   - `ExecutionHistoryService` manages and queries execution run metrics and history.

5. **Delivery Subsystem Rules**:
   - Delivery providers must never generate, format, or export reports.
   - Delivery providers only transport an existing `ExportResult`.
   - `DeliveryService` is the sole delivery orchestrator.
   - `JobExecutor` may call only `DeliveryService` (no direct driver imports).
   - Providers must never communicate with each other.
   - Provider registration must be runtime-based.
   - `DeliveryProviderFactory` handles provider instantiation via registration-based builders.
   - Transport adapters remain completely decoupled from the reporting domain and do not consume `ExportResult`.

6. **Observability Rules**:
   - `ExecutionHistoryService` is the single owner of execution history records.
   - Records are immutable once finalized (completed or failed).
   - No database, Firestore, or UI code resides inside the history core.

7. **Forecasting Subsystem Rules**:
   - All forecasting calculations are kept inside pure mathematical strategies.
   - `ForecastEngine` acts as an orchestration and timing boundary layer only.
   - Reporting rows are decoupled from strategies via `MetricSeriesExtractor` which enforces chronological order and filters NaN/Infinity values.

8. **Composition & Template Subsystem Rules**:
   - Templates must remain purely declarative blueprints containing no executable builder logic.
   - Section builders declare explicit dependencies via `dependsOn` lists.
   - `CompositionExecutionPlanner` computes topological batches to construct `ExecutionPlan` schedules.
   - All public contracts are deeply frozen at lifecycle boundaries.
   - One-way transformation from `ComposedReport` to `RenderableDocument` is strictly enforced.

9. **Dataset Engine Rules**:
   - `ReportDataset` remains behavior-oriented and contains an immutable collection of fragments and a `DatasetManifest`.
   - Raw string keys are prohibited; all access must be mediated via typed `DatasetKey<T>`.
   - `DatasetProviderMetadata` remains purely static.
   - The execution path is batched topologically using `DatasetExecutionPlanner`.
   - The engine uses middleware interceptors to resolve cross-cutting concerns (profiling, retries, caching).

10. **Governance Subsystem Rules**:
    - Declarative definition descriptors remain completely separate from execution logic.
    - Lifecycle transitions progress forward only; rollbacks are rejected by the validator.
    - Semantic versions are evaluated using stateless `VersionConstraintEvaluator` matched against parsed object constraints.
    - Compatibility analysis, migration planning, and execution outcomes are encapsulated in immutable reports, plans, and results.
    - `GovernanceService` serves as the public entry boundary facade.

11. **Diagnostics Subsystem Rules** (Wave 9 Phase 11):
    - `DiagnosticsService` is the sole public entry point for trace execution. No external code may access `TraceOrchestrator` or `DiagnosticsCollector` directly.
    - Context propagation uses `DiagnosticsContextProvider` exclusively. Reporting services must never thread `DiagnosticsContext` through function parameters manually.
    - Each reporting execution owns exactly one `DiagnosticsCollector`. Concurrent executions must never share collectors.
    - Once `DiagnosticsCollector.finalize()` is called, the collector is sealed. Aggregation only operates on finalized collectors.
    - `DiagnosticsAggregator` is stateless — a single instance may aggregate multiple independent trace sessions.
    - `TraceExporter` implementations must never throw. Errors during export are swallowed to prevent disrupting the reporting execution.
    - All contracts (`TraceSpan`, `DiagnosticsEvent`, `ExecutionTrace`, `DiagnosticsReport`) are deeply frozen after creation and must never be mutated.
    - Instrumentation adapters may only wrap existing pipeline operations. They must never perform business logic or modify operation outputs.
    - No Node.js-specific APIs (except `AsyncLocalStorage` in `AsyncLocalDiagnosticsContextProvider`) may appear in core diagnostics contracts or services.
