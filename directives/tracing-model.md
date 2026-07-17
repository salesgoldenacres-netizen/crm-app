# Tracing Model — Wave 9 Phase 11

## Trace Hierarchy

```
ExecutionTrace (root container)
├── TraceSpan (Root kind) — always first, wraps entire execution
│   ├── TraceSpan (Dataset kind) — dataset provider fetch
│   ├── TraceSpan (Dataset kind) — batch execution
│   ├── TraceSpan (Composition kind) — composition pipeline
│   │   └── TraceSpan (Builder kind) — section builder
│   ├── TraceSpan (Export kind) — export driver
│   └── TraceSpan (Delivery kind) — delivery provider
└── DiagnosticsEvent[] — emitted at any point during execution
```

## Flat Storage Model

Although traces are logically hierarchical, `ExecutionTrace.spans` stores them in a **flat, ordered array**. Parent-child relationships are established via `TraceSpan.parentSpanId` references. This avoids:
- Deep object nesting in serialization
- Complex recursive traversal
- Tree mutation complexity

The aggregator sorts spans chronologically by `startTimeMs` before emitting the final trace.

## Span Lifecycle

```
startSpan() → Running
    ↓
finishSpan(Completed) → Completed ✓
finishSpan(Failed, error) → Failed ✗
cancelledSpan() → Cancelled ⊘
```

Once finalized, spans are **never mutated**. `finishSpan()` returns a new frozen object.

## Context Propagation

```
runInTrace(context) → AsyncLocalStorage.run(context, fn)
                                   │
                    ┌──────────────┘
                    │
          fn() calls child services
                    │
          getContext() → returns context from nearest runInTrace
                    │
          deriveWithSpan(spanId) → derives context with new activeSpanId
```

The active `DiagnosticsContext` flows through async/await chains automatically. Services never need to thread context through function parameters.

## Event Model

Events are operational observations emitted within the scope of an active span:
- Cache hits / misses
- Fallback activation
- Threshold crossings
- Retry attempts

They are not execution units (no duration) — only timestamped observations with severity and attributes.

## PerformanceMetrics Derivation

`PerformanceMetricsCalculator` computes from the completed trace:
- `durationByKind` — total time spent per SpanKind (e.g., "how much total time did Dataset fetches take?")
- `countByKind` — how many spans per kind
- `timeToFirstSpanMs` — latency from trace start to first non-root child span
- `averageSpanDurationMs` — mean across all completed spans
