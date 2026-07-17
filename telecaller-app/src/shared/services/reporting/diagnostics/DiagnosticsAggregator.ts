// src/shared/services/reporting/diagnostics/DiagnosticsAggregator.ts

import { TraceSession } from "./TraceOrchestrator";
import { PerformanceMetricsCalculator } from "./PerformanceMetricsCalculator";
import { ExecutionTrace } from "./contracts/ExecutionTrace";
import { DiagnosticsReport, DiagnosticsReportEntry, ExecutionEnvironment } from "./contracts/DiagnosticsReport";
import { TraceStatus } from "./contracts/TraceStatus";
import { DiagnosticsSeverity } from "./contracts/DiagnosticsSeverity";
import { AggregationError } from "./DiagnosticsErrors";
import { SpanKind } from "./contracts/SpanKind";

/**
 * DiagnosticsAggregator transforms collected execution observations from a
 * finalized DiagnosticsCollector into an immutable DiagnosticsReport.
 *
 * Responsibilities:
 * 1. Assembles the flat ExecutionTrace from collector span/event snapshots.
 * 2. Computes PerformanceMetrics via PerformanceMetricsCalculator.
 * 3. Extracts and classifies report entries (warnings, errors, criticals).
 * 4. Captures the execution environment snapshot.
 * 5. Compiles the final DiagnosticsReport with summary string.
 *
 * DiagnosticsAggregator is stateless — a single instance can safely
 * aggregate multiple independent trace sessions.
 */
export class DiagnosticsAggregator {
  private readonly _calculator: PerformanceMetricsCalculator;

  constructor(calculator: PerformanceMetricsCalculator) {
    this._calculator = calculator;
  }

  /**
   * Compiles a DiagnosticsReport from a finalized TraceSession.
   *
   * @param session - The completed TraceSession (collector must be finalized).
   * @throws AggregationError if the collector is not finalized or root span is missing.
   * @returns An immutable, fully compiled DiagnosticsReport.
   */
  public aggregate(session: TraceSession): DiagnosticsReport {
    const collector = session.collector;

    if (!collector.isFinalized) {
      throw new AggregationError(
        `Cannot aggregate trace ${session.traceId.value} — collector has not been finalized.`
      );
    }

    const spans = collector.getSpans();
    const events = collector.getEvents();

    // Locate the root span
    const rootSpan = spans.find((s) => s.kind === SpanKind.Root);
    if (!rootSpan) {
      throw new AggregationError(
        `Root span not found in collector for trace ${session.traceId.value}`
      );
    }

    // Sort spans chronologically
    const sortedSpans = [...spans].sort((a, b) => a.startTimeMs - b.startTimeMs);

    // Sort events chronologically
    const sortedEvents = [...events].sort((a, b) => a.timestampMs - b.timestampMs);

    // Determine overall trace status from root span
    const traceStatus = rootSpan.status;
    const traceError = rootSpan.error ?? null;

    // Build the flat ExecutionTrace
    const trace: ExecutionTrace = Object.freeze({
      traceId: session.traceId,
      executionId: session.executionId,
      correlationId: session.correlationId,
      name: rootSpan.name,
      status: traceStatus,
      startTimeMs: rootSpan.startTimeMs,
      endTimeMs: rootSpan.endTimeMs,
      durationMs: rootSpan.durationMs,
      spans: Object.freeze(sortedSpans),
      events: Object.freeze(sortedEvents),
      error: traceError,
    });

    // Compute performance metrics
    const performance = this._calculator.calculate(trace);

    // Build entries from failed spans and warning/error events
    const entries: DiagnosticsReportEntry[] = [];

    for (const span of sortedSpans) {
      if (span.status === TraceStatus.Failed && span.error) {
        entries.push(Object.freeze({
          severity: DiagnosticsSeverity.Error,
          message: span.error.message,
          spanName: span.name,
          timestampMs: span.endTimeMs ?? span.startTimeMs,
        }));
      }
    }

    for (const event of sortedEvents) {
      if (
        event.severity === DiagnosticsSeverity.Warning ||
        event.severity === DiagnosticsSeverity.Error ||
        event.severity === DiagnosticsSeverity.Critical
      ) {
        entries.push(Object.freeze({
          severity: event.severity,
          message: event.message,
          spanName: null,
          timestampMs: event.timestampMs,
        }));
      }
    }

    // Sort entries chronologically
    const sortedEntries = entries.sort((a, b) => a.timestampMs - b.timestampMs);
    const warnings = sortedEntries.filter((e) => e.severity === DiagnosticsSeverity.Warning);
    const errors = sortedEntries.filter(
      (e) =>
        e.severity === DiagnosticsSeverity.Error ||
        e.severity === DiagnosticsSeverity.Critical
    );

    // Determine overall success
    const succeeded =
      traceStatus === TraceStatus.Completed &&
      performance.failedSpanCount === 0 &&
      performance.criticalEventCount === 0 &&
      performance.errorEventCount === 0;

    // Build environment snapshot
    const environment: ExecutionEnvironment = Object.freeze({
      platform: "node",
      runtimeVersion: typeof process !== "undefined" ? process.version : null,
      hostname: typeof process !== "undefined" ? (process.env["HOSTNAME"] ?? null) : null,
      capturedAt: new Date().toISOString(),
    });

    // Build summary string
    const durationStr =
      trace.durationMs !== null ? `${trace.durationMs}ms` : "in-progress";
    const summary = `${succeeded ? "Completed" : "Failed"} in ${durationStr} — ${performance.totalSpanCount} spans, ${performance.failedSpanCount} errors`;

    // Build and freeze report ID
    const reportId = `rpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const compiledAt = new Date().toISOString();

    return Object.freeze({
      reportId,
      compiledAt,
      trace,
      performance,
      environment,
      entries: Object.freeze(sortedEntries),
      warnings: Object.freeze(warnings),
      errors: Object.freeze(errors),
      events: Object.freeze(sortedEvents),
      succeeded,
      summary,
    });
  }
}
