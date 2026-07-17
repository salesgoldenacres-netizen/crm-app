// src/shared/services/reporting/diagnostics/contracts/ExecutionTrace.ts

import { TraceId, ExecutionId, CorrelationId } from "./Identifiers";
import { TraceSpan } from "./TraceSpan";
import { DiagnosticsEvent } from "./DiagnosticsEvent";
import { TraceStatus } from "./TraceStatus";

/**
 * Immutable record representing the complete lifecycle of a single reporting
 * operation. Flattens the trace hierarchy by keeping an ordered array of
 * spans and events rather than a nested tree.
 *
 * The root span is always first in the spans array. Parent-child
 * relationships are expressed via TraceSpan.parentSpanId references.
 */
export interface ExecutionTrace {
  /** Globally unique identifier for this trace. */
  readonly traceId: TraceId;

  /** Identifier of the execution context that produced this trace. */
  readonly executionId: ExecutionId;

  /** Correlation identifier linking this trace to the broader request context. */
  readonly correlationId: CorrelationId;

  /**
   * Human-readable name for this execution trace
   * (e.g., "GenerateMonthlyReport", "ExportLeadsSummary").
   */
  readonly name: string;

  /** Overall status of the entire traced execution. */
  readonly status: TraceStatus;

  /** Absolute wall-clock timestamp (ms since epoch) when the trace began. */
  readonly startTimeMs: number;

  /** Absolute wall-clock timestamp (ms since epoch) when the trace ended. Null if still running. */
  readonly endTimeMs: number | null;

  /** Total elapsed wall-clock duration in milliseconds. Null if still running. */
  readonly durationMs: number | null;

  /**
   * Ordered array of all spans recorded during this execution.
   * The root span (kind = Root) is always the first element.
   * Order is chronological by startTimeMs.
   */
  readonly spans: readonly TraceSpan[];

  /**
   * Ordered array of all operational events emitted during this execution.
   * Order is chronological by timestampMs.
   */
  readonly events: readonly DiagnosticsEvent[];

  /** Optional error captured at the trace level (e.g., unhandled rejection). */
  readonly error: Readonly<{ message: string; stack?: string }> | null;
}
