// src/shared/services/reporting/diagnostics/contracts/DiagnosticsContext.ts

import { TraceId, SpanId, ExecutionId, CorrelationId } from "./Identifiers";
import { DiagnosticsConfiguration } from "./DiagnosticsConfiguration";

/**
 * Immutable execution context carrying tracing and correlation metadata
 * throughout the reporting architecture, independent of the propagation
 * mechanism.
 *
 * A DiagnosticsContext is created once per execution and flows passively
 * through the system via a DiagnosticsContextProvider. It never mutates
 * during an execution lifetime.
 */
export interface DiagnosticsContext {
  /** The trace identifier for the current execution. */
  readonly traceId: TraceId;

  /** The unique identifier for the current execution instance. */
  readonly executionId: ExecutionId;

  /** The correlation identifier linking this execution to the initiating request. */
  readonly correlationId: CorrelationId;

  /**
   * The span identifier of the currently active span within the execution.
   * Updated when entering nested spans but the context itself is replaced
   * (not mutated) to maintain immutability.
   */
  readonly activeSpanId: SpanId | null;

  /** The diagnostics configuration controlling capture behavior for this execution. */
  readonly configuration: DiagnosticsConfiguration;

  /** ISO 8601 timestamp string representing when this context was created. */
  readonly createdAt: string;
}
