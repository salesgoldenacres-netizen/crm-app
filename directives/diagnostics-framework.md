# Diagnostics Framework — Wave 9 Phase 11 Reference

## Framework Goals

- Provide per-execution tracing with zero modification to existing service signatures.
- Expose deterministic, testable timing via `TraceClock` injection.
- Ensure concurrent executions never share diagnostic state.
- Produce an immutable `DiagnosticsReport` after every reporting execution.
- Support pluggable output via `TraceExporter` without coupling to any destination.

## Contract Inventory

### Value Objects (Identifiers.ts)
- `TraceId` — Top-level trace identifier (`trace_*`)
- `SpanId` — Individual operation identifier (`span_*`)
- `ExecutionId` — Execution context identifier (`exec_*`)
- `CorrelationId` — Cross-service correlation identifier (`corr_*`)

All are immutable value objects (frozen, `equals()` comparison).

### Enums
- `SpanKind` — Root | Dataset | Composition | Builder | Export | Delivery | Governance | Middleware | Validation | Transformation
- `TraceStatus` — Pending | Running | Completed | Failed | Cancelled | Skipped
- `DiagnosticsSeverity` — Info | Warning | Error | Critical

### Core Interfaces
- `DiagnosticsConfiguration` — Feature flags for what to capture (timing, stacks, args, results, metadata, events, exceptions) + sampling.
- `TraceSpan` — Immutable span record: spanId, parentSpanId, name, kind, status, startTimeMs, endTimeMs, durationMs, metadata, error, creationStack.
- `DiagnosticsEvent` — Immutable event: eventId, spanId, correlationId, name, message, severity, timestampMs, attributes.
- `ExecutionTrace` — Flat trace: traceId, executionId, correlationId, name, status, timing, spans[], events[], error.
- `DiagnosticsContext` — Immutable execution context: traceId, executionId, correlationId, activeSpanId, configuration, createdAt.
- `PerformanceMetrics` — Derived: totalDurationMs, max/min/avg span duration, span counts by status, event counts by severity, durationByKind, countByKind, timeToFirstSpanMs.
- `DiagnosticsReport` — Final artifact: reportId, compiledAt, trace, performance, environment, entries, warnings, errors, events, succeeded, summary.
- `TraceExporter` — exportTrace(trace) + exportReport(report).

## Concurrency Safety

Each call to `DiagnosticsService.runInTrace()` creates an isolated `DiagnosticsCollector`. `AsyncLocalStorage` ensures that `getContext()` always returns the context for the current async execution chain, never a sibling chain's context.

## Sampling

`DiagnosticsConfiguration.samplingStrategy` controls whether traces are captured:
- `"always"` — every execution is traced (default)
- `"never"` — no tracing
- `"random"` — traces at `samplingRate` probability

## Default Configuration

```ts
{
  timingEnabled: true,
  captureStackTraces: true,
  captureArguments: false,
  captureResults: false,
  captureMetadata: true,
  capturePerformance: true,
  captureEvents: true,
  captureExceptions: true,
  samplingRate: 1.0,
  samplingStrategy: "always"
}
```

## Usage Pattern

```ts
const service = DiagnosticsService.createDefault();

const { result, report } = await service.runInTrace("GenerateMonthlyReport", async () => {
  // ... reporting logic
  return report;
});

console.log(report.summary);
// "Completed in 142ms — 8 spans, 0 errors"
```
