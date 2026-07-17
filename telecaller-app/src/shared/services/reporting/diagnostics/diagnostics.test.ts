// src/shared/services/reporting/diagnostics/diagnostics.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { TraceId, SpanId, ExecutionId, CorrelationId } from "./contracts/Identifiers";
import { SpanKind } from "./contracts/SpanKind";
import { TraceStatus } from "./contracts/TraceStatus";
import { DiagnosticsSeverity } from "./contracts/DiagnosticsSeverity";
import { DEFAULT_DIAGNOSTICS_CONFIGURATION } from "./contracts/DiagnosticsConfiguration";
import { SystemTraceClock, ManualTraceClock } from "./TraceClock";
import { SpanFactory } from "./SpanFactory";
import { DiagnosticsCollector } from "./DiagnosticsCollector";
import { DiagnosticsCollectionError } from "./DiagnosticsErrors";
import { TraceCreationError, AggregationError } from "./DiagnosticsErrors";
import { PerformanceMetricsCalculator } from "./PerformanceMetricsCalculator";
import { DiagnosticsAggregator } from "./DiagnosticsAggregator";
import { InstrumentationMiddleware } from "./adapters/InstrumentationMiddleware";
import { DatasetInstrumentationAdapter } from "./adapters/DatasetInstrumentationAdapter";
import { ExecutionTrace } from "./contracts/ExecutionTrace";
import { DiagnosticsEvent } from "./contracts/DiagnosticsEvent";

// ─────────────────────────────────────────────────────────────
// Helper: build a minimal finalized TraceSession-like structure
// for aggregator tests.
// ─────────────────────────────────────────────────────────────
function buildFinalizedSession(
  spanFactory: SpanFactory,
  name = "TestTrace"
) {
  const traceId = TraceId.generate();
  const executionId = ExecutionId.generate();
  const correlationId = CorrelationId.generate();
  const collector = new DiagnosticsCollector();

  const rootSpan = spanFactory.startSpan({ name, kind: SpanKind.Root });
  collector.recordSpan(rootSpan);
  const finalizedRoot = spanFactory.finishSpan({ span: rootSpan });
  collector.updateSpan(finalizedRoot);
  collector.finalize();

  return {
    traceId,
    executionId,
    correlationId,
    rootSpanId: rootSpan.spanId,
    collector,
    context: null as any,
  };
}

// ─────────────────────────────────────────────────────────────
// Value Object Tests
// ─────────────────────────────────────────────────────────────

describe("Wave 9 Phase 11 — Diagnostics: Value Objects", () => {
  describe("TraceId", () => {
    it("generates unique values", () => {
      const a = TraceId.generate();
      const b = TraceId.generate();
      expect(a.value).not.toBe(b.value);
    });

    it("prefixes with 'trace_'", () => {
      expect(TraceId.generate().value).toMatch(/^trace_/);
    });

    it("is frozen after construction", () => {
      expect(Object.isFrozen(TraceId.generate())).toBe(true);
    });

    it("equals() compares by value", () => {
      const a = new TraceId("trace_abc");
      const b = new TraceId("trace_abc");
      const c = new TraceId("trace_xyz");
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    it("throws on empty value", () => {
      expect(() => new TraceId("")).toThrow("[TraceId]");
    });
  });

  describe("SpanId", () => {
    it("generates unique values", () => {
      const a = SpanId.generate();
      const b = SpanId.generate();
      expect(a.value).not.toBe(b.value);
    });

    it("prefixes with 'span_'", () => {
      expect(SpanId.generate().value).toMatch(/^span_/);
    });

    it("is frozen", () => {
      expect(Object.isFrozen(SpanId.generate())).toBe(true);
    });
  });

  describe("ExecutionId", () => {
    it("prefixes with 'exec_'", () => {
      expect(ExecutionId.generate().value).toMatch(/^exec_/);
    });

    it("equals() works correctly", () => {
      const id = new ExecutionId("exec_test");
      expect(id.equals(new ExecutionId("exec_test"))).toBe(true);
      expect(id.equals(new ExecutionId("exec_other"))).toBe(false);
    });
  });

  describe("CorrelationId", () => {
    it("prefixes with 'corr_'", () => {
      expect(CorrelationId.generate().value).toMatch(/^corr_/);
    });

    it("throws on empty value", () => {
      expect(() => new CorrelationId("")).toThrow("[CorrelationId]");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// TraceClock Tests
// ─────────────────────────────────────────────────────────────

describe("Wave 9 Phase 11 — Diagnostics: TraceClock", () => {
  it("SystemTraceClock returns a positive timestamp", () => {
    const clock = new SystemTraceClock();
    expect(clock.now()).toBeGreaterThan(0);
  });

  it("ManualTraceClock starts at provided initial time", () => {
    const clock = new ManualTraceClock(1000);
    expect(clock.now()).toBe(1000);
  });

  it("ManualTraceClock advances by delta", () => {
    const clock = new ManualTraceClock(1000);
    clock.advance(500);
    expect(clock.now()).toBe(1500);
  });

  it("ManualTraceClock sets absolute time", () => {
    const clock = new ManualTraceClock(0);
    clock.setTime(9999);
    expect(clock.now()).toBe(9999);
  });

  it("ManualTraceClock advances correctly across multiple steps", () => {
    const clock = new ManualTraceClock(0);
    clock.advance(100);
    clock.advance(200);
    clock.advance(50);
    expect(clock.now()).toBe(350);
  });
});

// ─────────────────────────────────────────────────────────────
// SpanFactory Tests
// ─────────────────────────────────────────────────────────────

describe("Wave 9 Phase 11 — Diagnostics: SpanFactory", () => {
  let clock: ManualTraceClock;
  let factory: SpanFactory;

  beforeEach(() => {
    clock = new ManualTraceClock(1000);
    factory = new SpanFactory(clock, DEFAULT_DIAGNOSTICS_CONFIGURATION);
  });

  it("startSpan returns a frozen Running span", () => {
    const span = factory.startSpan({ name: "Op1", kind: SpanKind.Dataset });
    expect(span.status).toBe(TraceStatus.Running);
    expect(span.endTimeMs).toBeNull();
    expect(span.durationMs).toBeNull();
    expect(Object.isFrozen(span)).toBe(true);
  });

  it("startSpan captures startTimeMs from clock", () => {
    const span = factory.startSpan({ name: "Op", kind: SpanKind.Export });
    expect(span.startTimeMs).toBe(1000);
  });

  it("finishSpan computes correct durationMs", () => {
    const span = factory.startSpan({ name: "Op", kind: SpanKind.Export });
    clock.advance(250);
    const finished = factory.finishSpan({ span });
    expect(finished.durationMs).toBe(250);
    expect(finished.endTimeMs).toBe(1250);
  });

  it("finishSpan defaults to Completed status", () => {
    const span = factory.startSpan({ name: "Op", kind: SpanKind.Builder });
    const finished = factory.finishSpan({ span });
    expect(finished.status).toBe(TraceStatus.Completed);
  });

  it("finishSpan records error when status is Failed", () => {
    const span = factory.startSpan({ name: "Op", kind: SpanKind.Delivery });
    const err = new Error("Something went wrong");
    const finished = factory.finishSpan({ span, status: TraceStatus.Failed, error: err });
    expect(finished.status).toBe(TraceStatus.Failed);
    expect(finished.error?.message).toBe("Something went wrong");
  });

  it("finishSpan merges additional metadata", () => {
    const span = factory.startSpan({
      name: "Op",
      kind: SpanKind.Governance,
      metadata: { initial: "yes" },
    });
    const finished = factory.finishSpan({
      span,
      additionalMetadata: { extra: "value" },
    });
    expect(finished.metadata["initial"]).toBe("yes");
    expect(finished.metadata["extra"]).toBe("value");
  });

  it("finishSpan returns a new frozen object (does not mutate original)", () => {
    const span = factory.startSpan({ name: "Op", kind: SpanKind.Root });
    const finished = factory.finishSpan({ span });
    // Original span still has null endTimeMs
    expect(span.endTimeMs).toBeNull();
    // New span has endTimeMs set
    expect(finished.endTimeMs).not.toBeNull();
    expect(Object.isFrozen(finished)).toBe(true);
  });

  it("cancelledSpan produces a Cancelled span with zero duration", () => {
    const span = factory.cancelledSpan({ name: "Op", kind: SpanKind.Validation });
    expect(span.status).toBe(TraceStatus.Cancelled);
    expect(span.durationMs).toBe(0);
  });

  it("startSpan sets parentSpanId when provided", () => {
    const parentId = SpanId.generate();
    const span = factory.startSpan({ name: "Child", kind: SpanKind.Builder, parentSpanId: parentId });
    expect(span.parentSpanId?.value).toBe(parentId.value);
  });

  it("startSpan sets parentSpanId to null when not provided", () => {
    const span = factory.startSpan({ name: "Root", kind: SpanKind.Root });
    expect(span.parentSpanId).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// DiagnosticsCollector Tests
// ─────────────────────────────────────────────────────────────

describe("Wave 9 Phase 11 — Diagnostics: DiagnosticsCollector", () => {
  let clock: ManualTraceClock;
  let factory: SpanFactory;
  let collector: DiagnosticsCollector;

  beforeEach(() => {
    clock = new ManualTraceClock(0);
    factory = new SpanFactory(clock, DEFAULT_DIAGNOSTICS_CONFIGURATION);
    collector = new DiagnosticsCollector();
  });

  it("starts with empty spans and events", () => {
    expect(collector.getSpans()).toHaveLength(0);
    expect(collector.getEvents()).toHaveLength(0);
  });

  it("records spans in order", () => {
    const s1 = factory.startSpan({ name: "A", kind: SpanKind.Root });
    const s2 = factory.startSpan({ name: "B", kind: SpanKind.Dataset });
    collector.recordSpan(s1);
    collector.recordSpan(s2);
    expect(collector.getSpans()).toHaveLength(2);
  });

  it("updateSpan replaces an existing span by spanId", () => {
    const running = factory.startSpan({ name: "Op", kind: SpanKind.Export });
    collector.recordSpan(running);
    clock.advance(100);
    const finished = factory.finishSpan({ span: running });
    collector.updateSpan(finished);
    const spans = collector.getSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0]!.status).toBe(TraceStatus.Completed);
    expect(spans[0]!.durationMs).toBe(100);
  });

  it("updateSpan appends span if spanId not found", () => {
    const s1 = factory.startSpan({ name: "A", kind: SpanKind.Root });
    const s2 = factory.startSpan({ name: "B", kind: SpanKind.Dataset });
    collector.recordSpan(s1);
    collector.updateSpan(s2); // different spanId — should append
    expect(collector.getSpans()).toHaveLength(2);
  });

  it("records events correctly", () => {
    const spanId = SpanId.generate();
    const correlationId = CorrelationId.generate();
    const event: DiagnosticsEvent = Object.freeze({
      eventId: "evt_1",
      spanId,
      correlationId,
      name: "cache.hit",
      message: "Cache hit",
      severity: DiagnosticsSeverity.Info,
      timestampMs: 500,
      attributes: {},
    });
    collector.recordEvent(event);
    expect(collector.getEvents()).toHaveLength(1);
    expect(collector.getEvents()[0]!.name).toBe("cache.hit");
  });

  it("getSpans returns a copy, not the internal array", () => {
    const s = factory.startSpan({ name: "X", kind: SpanKind.Root });
    collector.recordSpan(s);
    const snap1 = collector.getSpans();
    const snap2 = collector.getSpans();
    expect(snap1).not.toBe(snap2); // different array references
  });

  it("finalize seals the collector", () => {
    collector.finalize();
    expect(collector.isFinalized).toBe(true);
  });

  it("throws DiagnosticsCollectionError when recording after finalization", () => {
    collector.finalize();
    const s = factory.startSpan({ name: "Late", kind: SpanKind.Root });
    expect(() => collector.recordSpan(s)).toThrow(DiagnosticsCollectionError);
  });

  it("throws DiagnosticsCollectionError on updateSpan after finalization", () => {
    const s = factory.startSpan({ name: "S", kind: SpanKind.Root });
    collector.recordSpan(s);
    collector.finalize();
    const fin = factory.finishSpan({ span: s });
    expect(() => collector.updateSpan(fin)).toThrow(DiagnosticsCollectionError);
  });

  it("double finalize is a no-op", () => {
    collector.finalize();
    expect(() => collector.finalize()).not.toThrow();
    expect(collector.isFinalized).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// PerformanceMetricsCalculator Tests
// ─────────────────────────────────────────────────────────────

describe("Wave 9 Phase 11 — Diagnostics: PerformanceMetricsCalculator", () => {
  const calculator = new PerformanceMetricsCalculator();
  const traceId = TraceId.generate();
  const executionId = ExecutionId.generate();
  const correlationId = CorrelationId.generate();

  function buildTrace(
    spans: ReturnType<SpanFactory["finishSpan"]>[],
    events: DiagnosticsEvent[] = []
  ): ExecutionTrace {
    const root = spans[0]!;
    return Object.freeze({
      traceId,
      executionId,
      correlationId,
      name: "TestTrace",
      status: TraceStatus.Completed,
      startTimeMs: root.startTimeMs,
      endTimeMs: root.endTimeMs ?? root.startTimeMs + 1,
      durationMs: root.durationMs ?? 0,
      spans: Object.freeze(spans),
      events: Object.freeze(events),
      error: null,
    });
  }

  it("computes totalDurationMs from trace", () => {
    const clock = new ManualTraceClock(1000);
    const factory = new SpanFactory(clock, DEFAULT_DIAGNOSTICS_CONFIGURATION);
    const root = factory.startSpan({ name: "Root", kind: SpanKind.Root });
    clock.advance(300);
    const finished = factory.finishSpan({ span: root });
    const trace = buildTrace([finished]);
    const metrics = calculator.calculate(trace);
    expect(metrics.totalDurationMs).toBe(300);
  });

  it("computes span counts by status", () => {
    const clock = new ManualTraceClock(0);
    const factory = new SpanFactory(clock, DEFAULT_DIAGNOSTICS_CONFIGURATION);
    const root = factory.startSpan({ name: "Root", kind: SpanKind.Root });
    const child1 = factory.startSpan({ name: "C1", kind: SpanKind.Dataset });
    const child2 = factory.startSpan({ name: "C2", kind: SpanKind.Export });
    clock.advance(100);
    const finRoot = factory.finishSpan({ span: root });
    const finC1 = factory.finishSpan({ span: child1 });
    const finC2 = factory.finishSpan({ span: child2, status: TraceStatus.Failed });
    const trace = buildTrace([finRoot, finC1, finC2]);
    const metrics = calculator.calculate(trace);
    expect(metrics.totalSpanCount).toBe(3);
    expect(metrics.successfulSpanCount).toBe(2);
    expect(metrics.failedSpanCount).toBe(1);
  });

  it("counts events by severity", () => {
    const clock = new ManualTraceClock(0);
    const factory = new SpanFactory(clock, DEFAULT_DIAGNOSTICS_CONFIGURATION);
    const root = factory.startSpan({ name: "Root", kind: SpanKind.Root });
    clock.advance(50);
    const finRoot = factory.finishSpan({ span: root });
    const spanId = SpanId.generate();

    const events: DiagnosticsEvent[] = [
      { eventId: "e1", spanId, correlationId, name: "warn.1", message: "w", severity: DiagnosticsSeverity.Warning, timestampMs: 10, attributes: {} },
      { eventId: "e2", spanId, correlationId, name: "err.1", message: "e", severity: DiagnosticsSeverity.Error, timestampMs: 20, attributes: {} },
      { eventId: "e3", spanId, correlationId, name: "crit.1", message: "c", severity: DiagnosticsSeverity.Critical, timestampMs: 30, attributes: {} },
      { eventId: "e4", spanId, correlationId, name: "info.1", message: "i", severity: DiagnosticsSeverity.Info, timestampMs: 40, attributes: {} },
    ];

    const trace = buildTrace([finRoot], events);
    const metrics = calculator.calculate(trace);
    expect(metrics.warningEventCount).toBe(1);
    expect(metrics.errorEventCount).toBe(1);
    expect(metrics.criticalEventCount).toBe(1);
    expect(metrics.totalEventCount).toBe(4);
  });

  it("computes durationByKind correctly", () => {
    const clock = new ManualTraceClock(0);
    const factory = new SpanFactory(clock, DEFAULT_DIAGNOSTICS_CONFIGURATION);
    const root = factory.startSpan({ name: "Root", kind: SpanKind.Root });
    const dataset = factory.startSpan({ name: "DS", kind: SpanKind.Dataset });
    clock.advance(200);
    const finRoot = factory.finishSpan({ span: root });
    const finDataset = factory.finishSpan({ span: dataset });
    const trace = buildTrace([finRoot, finDataset]);
    const metrics = calculator.calculate(trace);
    expect(metrics.durationByKind["Dataset"]).toBe(200);
    expect(metrics.durationByKind["Root"]).toBe(200);
  });

  it("timeToFirstSpanMs is null when no non-root spans exist", () => {
    const clock = new ManualTraceClock(0);
    const factory = new SpanFactory(clock, DEFAULT_DIAGNOSTICS_CONFIGURATION);
    const root = factory.startSpan({ name: "Root", kind: SpanKind.Root });
    clock.advance(100);
    const finRoot = factory.finishSpan({ span: root });
    const trace = buildTrace([finRoot]);
    const metrics = calculator.calculate(trace);
    expect(metrics.timeToFirstSpanMs).toBeNull();
  });

  it("timeToFirstSpanMs is computed when child spans exist", () => {
    const clock = new ManualTraceClock(1000);
    const factory = new SpanFactory(clock, DEFAULT_DIAGNOSTICS_CONFIGURATION);
    const root = factory.startSpan({ name: "Root", kind: SpanKind.Root });
    clock.advance(50);
    const child = factory.startSpan({ name: "Child", kind: SpanKind.Dataset });
    clock.advance(100);
    const finRoot = factory.finishSpan({ span: root });
    const finChild = factory.finishSpan({ span: child });
    const trace = buildTrace([finRoot, finChild]);
    const metrics = calculator.calculate(trace);
    expect(metrics.timeToFirstSpanMs).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────
// DiagnosticsAggregator Tests
// ─────────────────────────────────────────────────────────────

describe("Wave 9 Phase 11 — Diagnostics: DiagnosticsAggregator", () => {
  let clock: ManualTraceClock;
  let factory: SpanFactory;
  let calculator: PerformanceMetricsCalculator;
  let aggregator: DiagnosticsAggregator;

  beforeEach(() => {
    clock = new ManualTraceClock(1000);
    factory = new SpanFactory(clock, DEFAULT_DIAGNOSTICS_CONFIGURATION);
    calculator = new PerformanceMetricsCalculator();
    aggregator = new DiagnosticsAggregator(calculator);
  });

  it("throws AggregationError when collector is not finalized", () => {
    const session = {
      traceId: TraceId.generate(),
      executionId: ExecutionId.generate(),
      correlationId: CorrelationId.generate(),
      rootSpanId: SpanId.generate(),
      collector: new DiagnosticsCollector(),
      context: null as any,
    };
    expect(() => aggregator.aggregate(session)).toThrow(AggregationError);
  });

  it("produces an immutable DiagnosticsReport", () => {
    const session = buildFinalizedSession(factory, "TestExecution");
    const report = aggregator.aggregate(session);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.trace)).toBe(true);
    expect(Object.isFrozen(report.performance)).toBe(true);
  });

  it("report.succeeded is true for a clean execution", () => {
    const session = buildFinalizedSession(factory, "CleanExecution");
    const report = aggregator.aggregate(session);
    expect(report.succeeded).toBe(true);
  });

  it("report.succeeded is false when root span failed", () => {
    const traceId = TraceId.generate();
    const executionId = ExecutionId.generate();
    const correlationId = CorrelationId.generate();
    const collector = new DiagnosticsCollector();
    const root = factory.startSpan({ name: "FailedRoot", kind: SpanKind.Root });
    collector.recordSpan(root);
    clock.advance(100);
    const failedRoot = factory.finishSpan({
      span: root,
      status: TraceStatus.Failed,
      error: new Error("Root failed"),
    });
    collector.updateSpan(failedRoot);
    collector.finalize();

    const session = { traceId, executionId, correlationId, rootSpanId: root.spanId, collector, context: null as any };
    const report = aggregator.aggregate(session);
    expect(report.succeeded).toBe(false);
  });

  it("report.summary contains duration and span count", () => {
    const session = buildFinalizedSession(factory, "SummaryTest");
    const report = aggregator.aggregate(session);
    expect(report.summary).toMatch(/\d+ms/);
    expect(report.summary).toMatch(/span/);
  });

  it("report.trace.spans are sorted chronologically", () => {
    const traceId = TraceId.generate();
    const executionId = ExecutionId.generate();
    const correlationId = CorrelationId.generate();
    const collector = new DiagnosticsCollector();

    const root = factory.startSpan({ name: "Root", kind: SpanKind.Root });
    collector.recordSpan(root);
    clock.advance(50);
    const child = factory.startSpan({ name: "Child", kind: SpanKind.Dataset });
    collector.recordSpan(child);
    clock.advance(100);
    const finChild = factory.finishSpan({ span: child });
    collector.updateSpan(finChild);
    const finRoot = factory.finishSpan({ span: root });
    collector.updateSpan(finRoot);
    collector.finalize();

    const session = { traceId, executionId, correlationId, rootSpanId: root.spanId, collector, context: null as any };
    const report = aggregator.aggregate(session);

    const spanTimes = report.trace.spans.map((s) => s.startTimeMs);
    for (let i = 1; i < spanTimes.length; i++) {
      expect(spanTimes[i]!).toBeGreaterThanOrEqual(spanTimes[i - 1]!);
    }
  });

  it("report.errors contains entries from failed spans", () => {
    const traceId = TraceId.generate();
    const executionId = ExecutionId.generate();
    const correlationId = CorrelationId.generate();
    const collector = new DiagnosticsCollector();

    const root = factory.startSpan({ name: "Root", kind: SpanKind.Root });
    collector.recordSpan(root);
    const child = factory.startSpan({ name: "FailingChild", kind: SpanKind.Export });
    collector.recordSpan(child);
    clock.advance(50);
    const finChild = factory.finishSpan({ span: child, status: TraceStatus.Failed, error: new Error("Export error") });
    collector.updateSpan(finChild);
    const finRoot = factory.finishSpan({ span: root });
    collector.updateSpan(finRoot);
    collector.finalize();

    const session = { traceId, executionId, correlationId, rootSpanId: root.spanId, collector, context: null as any };
    const report = aggregator.aggregate(session);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]!.message).toBe("Export error");
  });

  it("report has a non-empty reportId and compiledAt", () => {
    const session = buildFinalizedSession(factory);
    const report = aggregator.aggregate(session);
    expect(report.reportId).toMatch(/^rpt_/);
    expect(report.compiledAt).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────
// InstrumentationMiddleware Tests
// ─────────────────────────────────────────────────────────────

describe("Wave 9 Phase 11 — Diagnostics: InstrumentationMiddleware", () => {
  it("instrument wraps a successful operation and records a Completed span", async () => {
    const clock = new ManualTraceClock(0);
    const config = { ...DEFAULT_DIAGNOSTICS_CONFIGURATION, captureStackTraces: false };
    const factory = new SpanFactory(clock, config);

    // Build a minimal in-memory mock session
    const traceId = TraceId.generate();
    const executionId = ExecutionId.generate();
    const correlationId = CorrelationId.generate();
    const collector = new DiagnosticsCollector();
    const rootSpan = factory.startSpan({ name: "Root", kind: SpanKind.Root });
    collector.recordSpan(rootSpan);

    class MockOrchestrator {
      startSpan(session: any, opts: any) {
        const span = factory.startSpan(opts);
        session.collector.recordSpan(span);
        return span;
      }
      finishSpan(session: any, span: any, status?: TraceStatus, error?: Error | null) {
        clock.advance(100);
        const finished = factory.finishSpan({ span, status, error });
        session.collector.updateSpan(finished);
        return finished;
      }
      emitEvent(session: any, name: string, message: string, severity: DiagnosticsSeverity, attrs: any) {
        const event: DiagnosticsEvent = Object.freeze({
          eventId: "evt_mock",
          spanId: session.rootSpanId,
          correlationId,
          name,
          message,
          severity,
          timestampMs: clock.now(),
          attributes: attrs ?? {},
        });
        session.collector.recordEvent(event);
      }
    }

    const mockOrchestrator = new MockOrchestrator() as any;
    const middleware = new InstrumentationMiddleware(mockOrchestrator);
    const session = { traceId, executionId, correlationId, rootSpanId: rootSpan.spanId, collector, context: null as any };

    const result = await middleware.instrument(
      session,
      { spanName: "fetch.data", kind: SpanKind.Dataset },
      async () => 42
    );

    expect(result).toBe(42);
    const spans = collector.getSpans();
    const instrumentedSpan = spans.find((s) => s.name === "fetch.data");
    expect(instrumentedSpan).toBeDefined();
    expect(instrumentedSpan?.status).toBe(TraceStatus.Completed);
  });

  it("instrument records Failed span and emits failure event on error", async () => {
    const clock = new ManualTraceClock(0);
    const config = DEFAULT_DIAGNOSTICS_CONFIGURATION;
    const factory = new SpanFactory(clock, config);

    const traceId = TraceId.generate();
    const executionId = ExecutionId.generate();
    const correlationId = CorrelationId.generate();
    const collector = new DiagnosticsCollector();
    const rootSpan = factory.startSpan({ name: "Root", kind: SpanKind.Root });
    collector.recordSpan(rootSpan);

    class MockOrchestrator {
      startSpan(session: any, opts: any) {
        const span = factory.startSpan(opts);
        session.collector.recordSpan(span);
        return span;
      }
      finishSpan(session: any, span: any, status?: TraceStatus, error?: Error | null) {
        const finished = factory.finishSpan({ span, status, error });
        session.collector.updateSpan(finished);
        return finished;
      }
      emitEvent(session: any, name: string, message: string, severity: DiagnosticsSeverity, attrs: any) {
        const event: DiagnosticsEvent = Object.freeze({
          eventId: "evt_err",
          spanId: session.rootSpanId,
          correlationId,
          name,
          message,
          severity,
          timestampMs: clock.now(),
          attributes: attrs ?? {},
        });
        session.collector.recordEvent(event);
      }
    }

    const mockOrchestrator = new MockOrchestrator() as any;
    const middleware = new InstrumentationMiddleware(mockOrchestrator);
    const session = { traceId, executionId, correlationId, rootSpanId: rootSpan.spanId, collector, context: null as any };

    await expect(
      middleware.instrument(
        session,
        { spanName: "broken.op", kind: SpanKind.Export },
        async () => { throw new Error("Exploded"); }
      )
    ).rejects.toThrow("Exploded");

    const failSpan = collector.getSpans().find((s) => s.name === "broken.op");
    expect(failSpan?.status).toBe(TraceStatus.Failed);
    expect(collector.getEvents()).toHaveLength(1);
    expect(collector.getEvents()[0]!.severity).toBe(DiagnosticsSeverity.Error);
  });
});

// ─────────────────────────────────────────────────────────────
// DatasetInstrumentationAdapter Tests
// ─────────────────────────────────────────────────────────────

describe("Wave 9 Phase 11 — Diagnostics: DatasetInstrumentationAdapter", () => {
  it("instrumentProviderFetch creates Dataset-kind span with providerKey metadata", async () => {
    const clock = new ManualTraceClock(0);
    const config = DEFAULT_DIAGNOSTICS_CONFIGURATION;
    const factory = new SpanFactory(clock, config);

    const traceId = TraceId.generate();
    const executionId = ExecutionId.generate();
    const correlationId = CorrelationId.generate();
    const collector = new DiagnosticsCollector();
    const rootSpan = factory.startSpan({ name: "Root", kind: SpanKind.Root });
    collector.recordSpan(rootSpan);

    const recordedSpans: any[] = [];
    class MockOrchestrator {
      startSpan(_session: any, opts: any) {
        const span = factory.startSpan(opts);
        recordedSpans.push(span);
        return span;
      }
      finishSpan(_session: any, span: any, status?: TraceStatus) {
        return factory.finishSpan({ span, status });
      }
      emitEvent() {}
    }

    const middleware = new InstrumentationMiddleware(new MockOrchestrator() as any);
    const adapter = new DatasetInstrumentationAdapter(middleware);
    const session = { traceId, executionId, correlationId, rootSpanId: rootSpan.spanId, collector, context: null as any };

    await adapter.instrumentProviderFetch(session, "leads-by-project", async () => "data");

    expect(recordedSpans).toHaveLength(1);
    expect(recordedSpans[0]!.name).toBe("dataset.fetch[leads-by-project]");
    expect(recordedSpans[0]!.kind).toBe(SpanKind.Dataset);
    expect(recordedSpans[0]!.metadata["providerKey"]).toBe("leads-by-project");
  });
});

// ─────────────────────────────────────────────────────────────
// DiagnosticsErrors Tests
// ─────────────────────────────────────────────────────────────

describe("Wave 9 Phase 11 — Diagnostics: Error Types", () => {
  it("TraceCreationError has correct code and name", () => {
    const err = new TraceCreationError("bad trace");
    expect(err.code).toBe("TRACE_CREATION_ERROR");
    expect(err.name).toBe("TraceCreationError");
    expect(err.message).toContain("[TraceCreationError]");
  });

  it("DiagnosticsCollectionError has correct code", () => {
    const err = new DiagnosticsCollectionError("collection failed");
    expect(err.code).toBe("DIAGNOSTICS_COLLECTION_ERROR");
  });

  it("AggregationError has correct code", () => {
    const err = new AggregationError("aggregation failed");
    expect(err.code).toBe("AGGREGATION_ERROR");
  });

  it("errors chain cause correctly", () => {
    const cause = new Error("root cause");
    const err = new TraceCreationError("wrapper", cause);
    expect(err.stack).toContain("Caused by:");
  });
});
