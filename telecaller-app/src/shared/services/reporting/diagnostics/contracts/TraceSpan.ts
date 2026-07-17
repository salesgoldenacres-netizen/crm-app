// src/shared/services/reporting/diagnostics/contracts/TraceSpan.ts

import { SpanId } from "./Identifiers";
import { SpanKind } from "./SpanKind";
import { TraceStatus } from "./TraceStatus";

/**
 * Immutable record of a single traced operation within an ExecutionTrace.
 * Captures identity, timing, status, metadata, parent-child relationships,
 * and span classification.
 */
export interface TraceSpan {
  /** Unique identifier for this span. */
  readonly spanId: SpanId;

  /** Optional parent span identifier for establishing parent-child relationships. */
  readonly parentSpanId: SpanId | null;

  /** Human-readable name identifying the operation traced by this span. */
  readonly name: string;

  /** Classification of the span within the reporting pipeline. */
  readonly kind: SpanKind;

  /** Current lifecycle status of the span. */
  readonly status: TraceStatus;

  /** Absolute wall-clock timestamp (ms since epoch) when the span started. */
  readonly startTimeMs: number;

  /** Absolute wall-clock timestamp (ms since epoch) when the span ended. Null if still running. */
  readonly endTimeMs: number | null;

  /** Total elapsed duration in milliseconds. Null if still running. */
  readonly durationMs: number | null;

  /**
   * Optional structured metadata providing additional context about the
   * operation. Values must be serializable primitives.
   */
  readonly metadata: Readonly<Record<string, string | number | boolean | null>>;

  /**
   * Optional error captured during span execution. Present only when
   * status is Failed.
   */
  readonly error: Readonly<{ message: string; stack?: string }> | null;

  /** Optional stack trace at span creation, captured when captureStackTraces is enabled. */
  readonly creationStack: string | null;
}