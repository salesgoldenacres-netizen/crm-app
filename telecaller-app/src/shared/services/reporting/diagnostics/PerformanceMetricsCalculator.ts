// src/shared/services/reporting/diagnostics/PerformanceMetricsCalculator.ts

import { ExecutionTrace } from "./contracts/ExecutionTrace";
import { TraceSpan } from "./contracts/TraceSpan";
import { PerformanceMetrics } from "./contracts/PerformanceMetrics";
import { TraceStatus } from "./contracts/TraceStatus";
import { DiagnosticsSeverity } from "./contracts/DiagnosticsSeverity";
import { SpanKind } from "./contracts/SpanKind";

/**
 * Stateless calculator that derives PerformanceMetrics from a completed
 * ExecutionTrace.
 *
 * All methods are pure functions. No state is maintained between calls.
 * The calculator makes no assumptions about span ordering — it handles
 * any ordering of spans in the trace.
 */
export class PerformanceMetricsCalculator {

  /**
   * Computes PerformanceMetrics from a completed ExecutionTrace.
   *
   * @param trace - The completed ExecutionTrace to analyze.
   * @returns An immutable PerformanceMetrics record.
   */
  public calculate(trace: ExecutionTrace): PerformanceMetrics {
    const completedSpans = trace.spans.filter(
      (s) => s.durationMs !== null
    );

    const durations = completedSpans
      .map((s) => s.durationMs as number)
      .filter((d) => d >= 0);

    const maxSpanDurationMs = durations.length > 0 ? Math.max(...durations) : 0;
    const minSpanDurationMs = durations.length > 0
      ? Math.min(...durations.filter((d) => d > 0))
      : 0;

    const averageSpanDurationMs =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

    const successfulSpanCount = trace.spans.filter(
      (s) => s.status === TraceStatus.Completed
    ).length;

    const failedSpanCount = trace.spans.filter(
      (s) => s.status === TraceStatus.Failed
    ).length;

    const cancelledSpanCount = trace.spans.filter(
      (s) => s.status === TraceStatus.Cancelled
    ).length;

    const skippedSpanCount = trace.spans.filter(
      (s) => s.status === TraceStatus.Skipped
    ).length;

    const warningEventCount = trace.events.filter(
      (e) => e.severity === DiagnosticsSeverity.Warning
    ).length;

    const errorEventCount = trace.events.filter(
      (e) => e.severity === DiagnosticsSeverity.Error
    ).length;

    const criticalEventCount = trace.events.filter(
      (e) => e.severity === DiagnosticsSeverity.Critical
    ).length;

    const durationByKind = this._computeDurationByKind(trace.spans);
    const countByKind = this._computeCountByKind(trace.spans);

    const timeToFirstSpanMs = this._computeTimeToFirstSpan(trace);

    return Object.freeze({
      totalDurationMs: trace.durationMs ?? 0,
      maxSpanDurationMs,
      minSpanDurationMs: minSpanDurationMs === Infinity ? 0 : minSpanDurationMs,
      averageSpanDurationMs: Math.round(averageSpanDurationMs * 100) / 100,
      totalSpanCount: trace.spans.length,
      successfulSpanCount,
      failedSpanCount,
      cancelledSpanCount,
      skippedSpanCount,
      totalEventCount: trace.events.length,
      warningEventCount,
      errorEventCount,
      criticalEventCount,
      durationByKind: Object.freeze(durationByKind),
      countByKind: Object.freeze(countByKind),
      timeToFirstSpanMs,
    });
  }

  private _computeDurationByKind(spans: readonly TraceSpan[]): Record<string, number> {
    const acc: Record<string, number> = {};
    for (const kind of Object.values(SpanKind)) {
      acc[kind] = 0;
    }
    for (const span of spans) {
      if (span.durationMs !== null) {
        const key = span.kind as string;
        acc[key] = (acc[key] ?? 0) + span.durationMs;
      }
    }
    return acc;
  }

  private _computeCountByKind(spans: readonly TraceSpan[]): Record<string, number> {
    const acc: Record<string, number> = {};
    for (const kind of Object.values(SpanKind)) {
      acc[kind] = 0;
    }
    for (const span of spans) {
      const key = span.kind as string;
      acc[key] = (acc[key] ?? 0) + 1;
    }
    return acc;
  }

  private _computeTimeToFirstSpan(trace: ExecutionTrace): number | null {
    const nonRootSpans = trace.spans.filter(
      (s) => s.kind !== SpanKind.Root
    );
    if (nonRootSpans.length === 0) return null;

    const earliest = Math.min(...nonRootSpans.map((s) => s.startTimeMs));
    return earliest - trace.startTimeMs;
  }
}
