// src/shared/services/reporting/diagnostics/contracts/DiagnosticsEvent.ts

import { SpanId, CorrelationId } from "./Identifiers";
import { DiagnosticsSeverity } from "./DiagnosticsSeverity";

/**
 * Immutable operational event associated with a trace or span, representing
 * noteworthy occurrences (e.g., cache hits/misses, fallback activation,
 * threshold crossings) that are not standalone execution units.
 *
 * Events are appended to the collector and associated with a parent span.
 * They carry severity and structured attributes for operational analysis.
 */
export interface DiagnosticsEvent {
  /** Unique identifier for this event. */
  readonly eventId: string;

  /** The span this event was emitted from. */
  readonly spanId: SpanId;

  /** The correlation ID of the enclosing execution context. */
  readonly correlationId: CorrelationId;

  /** Short, machine-readable event name (e.g., "cache.hit", "fallback.activated"). */
  readonly name: string;

  /** Human-readable description of what occurred. */
  readonly message: string;

  /** Severity level of this event. */
  readonly severity: DiagnosticsSeverity;

  /** Absolute wall-clock timestamp (ms since epoch) when the event was emitted. */
  readonly timestampMs: number;

  /**
   * Optional structured attributes providing additional context.
   * Values must be serializable primitives.
   */
  readonly attributes: Readonly<Record<string, string | number | boolean | null>>;
}
