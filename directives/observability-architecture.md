# Observability Architecture — Golden Acres CRM Reporting Platform

## Overview

The Reporting Observability & Diagnostics Framework provides end-to-end execution visibility for every report generated through the Golden Acres CRM. It is a **zero-overhead, passive diagnostics system** that hooks into the reporting engine at instrumentation points without altering business logic, service signatures, or data flows.

## Architectural Layers

```text
DiagnosticsService (Public Façade)
         │
         ▼
TraceOrchestrator (Span + Context Coordination)
         │                         │
         ▼                         ▼
SpanFactory              DiagnosticsContextProvider
(Immutable Spans)        (AsyncLocalStorage / Manual / Test)
         │
         ▼
DiagnosticsCollector (Execution-Scoped Accumulation)
         │
         ▼
DiagnosticsAggregator + PerformanceMetricsCalculator
         │
         ▼
DiagnosticsReport (Immutable Post-Execution Artifact)
         │
         ▼
TraceExporter[] (Pluggable Output Destinations)
```

## Component Summary

| Component | Responsibility |
|-----------|---------------|
| `DiagnosticsService` | Public façade; `runInTrace` / `runInSpan` entry points |
| `TraceOrchestrator` | Coordinates span lifecycle, event emission, context propagation |
| `SpanFactory` | Creates and finalizes immutable `TraceSpan` records |
| `DiagnosticsContextProvider` | Propagates `DiagnosticsContext` through async execution |
| `AsyncLocalDiagnosticsContextProvider` | Node.js `AsyncLocalStorage` implementation |
| `DiagnosticsCollector` | Execution-scoped accumulator for spans and events |
| `PerformanceMetricsCalculator` | Derives timing, count, and severity metrics from raw traces |
| `DiagnosticsAggregator` | Compiles flat `DiagnosticsReport` from finalized collector |
| `TraceClock` | Time abstraction for deterministic testing |
| `TraceExporter` | Pluggable interface for dispatching traces to destinations |

## Instrumentation Adapters

Pipeline-specific adapters provide domain-aware instrumentation without modifying business files:

| Adapter | Target Pipeline | SpanKinds Used |
|---------|----------------|----------------|
| `DatasetInstrumentationAdapter` | Dataset providers and batches | `Dataset` |
| `CompositionInstrumentationAdapter` | Section builders and composition plans | `Composition`, `Builder` |
| `ExportInstrumentationAdapter` | Export drivers and serialization | `Export`, `Transformation` |
| `DeliveryInstrumentationAdapter` | Delivery providers and channels | `Delivery` |
| `GovernanceInstrumentationAdapter` | Lifecycle checks, constraint validation, migrations | `Governance`, `Validation` |

## Key Design Principles

1. **Zero Disruption** — No existing service signatures were modified. All instrumentation is additive.
2. **Execution-Scoped Isolation** — Each report execution owns one `DiagnosticsCollector`. Concurrent executions never share state.
3. **Immutability Throughout** — Every contract (`TraceSpan`, `DiagnosticsEvent`, `ExecutionTrace`, `DiagnosticsReport`) is frozen after creation.
4. **Flat Trace Model** — Parent-child span relationships are expressed via `parentSpanId` references in a flat array, avoiding deep nesting.
5. **Exporter Fault Isolation** — Exporter failures are swallowed; they never disrupt the reporting flow.
6. **Deterministic Testing** — `ManualTraceClock` and `DiagnosticsCollector` snapshots enable fully deterministic unit tests.
