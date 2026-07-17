// src/shared/services/reporting/diagnostics/contracts/PerformanceMetrics.ts

/**
 * Derived performance summary metrics computed from a completed ExecutionTrace.
 *
 * All timing values are in milliseconds. Counts are non-negative integers.
 * This interface is produced by PerformanceMetricsCalculator and is embedded
 * in the final DiagnosticsReport.
 */
export interface PerformanceMetrics {
  /** Total wall-clock elapsed time for the entire execution in milliseconds. */
  readonly totalDurationMs: number;

  /** Duration of the longest single span in milliseconds. */
  readonly maxSpanDurationMs: number;

  /** Duration of the shortest non-zero-length completed span in milliseconds. */
  readonly minSpanDurationMs: number;

  /** Mean (average) span duration across all completed spans in milliseconds. */
  readonly averageSpanDurationMs: number;

  /** Total number of spans recorded (including root, child, and nested spans). */
  readonly totalSpanCount: number;

  /** Number of spans that completed successfully. */
  readonly successfulSpanCount: number;

  /** Number of spans that terminated in a Failed status. */
  readonly failedSpanCount: number;

  /** Number of spans that were cancelled. */
  readonly cancelledSpanCount: number;

  /** Number of spans that were skipped. */
  readonly skippedSpanCount: number;

  /** Total number of diagnostic events emitted during the execution. */
  readonly totalEventCount: number;

  /** Number of events with Warning severity. */
  readonly warningEventCount: number;

  /** Number of events with Error severity. */
  readonly errorEventCount: number;

  /** Number of events with Critical severity. */
  readonly criticalEventCount: number;

  /**
   * Per-kind aggregated duration totals in milliseconds.
   * Keys correspond to SpanKind string values.
   */
  readonly durationByKind: Readonly<Record<string, number>>;

  /**
   * Per-kind span counts.
   * Keys correspond to SpanKind string values.
   */
  readonly countByKind: Readonly<Record<string, number>>;

  /** Time from trace start to when the first non-root span began, in milliseconds. */
  readonly timeToFirstSpanMs: number | null;
}
