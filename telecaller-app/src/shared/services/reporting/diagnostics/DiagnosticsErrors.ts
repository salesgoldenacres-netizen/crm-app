// src/shared/services/reporting/diagnostics/DiagnosticsErrors.ts

/**
 * Thrown when a trace cannot be created due to invalid parameters,
 * missing required context, or internal state corruption.
 */
export class TraceCreationError extends Error {
  public readonly code = "TRACE_CREATION_ERROR";

  constructor(message: string, public readonly cause?: Error) {
    super(`[TraceCreationError] ${message}`);
    this.name = "TraceCreationError";
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack ?? cause.message}`;
    }
  }
}

/**
 * Thrown when the diagnostics collector encounters an error while
 * recording a span or event (e.g., attempting to record after finalization).
 */
export class DiagnosticsCollectionError extends Error {
  public readonly code = "DIAGNOSTICS_COLLECTION_ERROR";

  constructor(message: string, public readonly cause?: Error) {
    super(`[DiagnosticsCollectionError] ${message}`);
    this.name = "DiagnosticsCollectionError";
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack ?? cause.message}`;
    }
  }
}

/**
 * Thrown when the DiagnosticsAggregator fails to compile a DiagnosticsReport
 * from the collected execution data (e.g., missing root span, invalid trace state).
 */
export class AggregationError extends Error {
  public readonly code = "AGGREGATION_ERROR";

  constructor(message: string, public readonly cause?: Error) {
    super(`[AggregationError] ${message}`);
    this.name = "AggregationError";
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack ?? cause.message}`;
    }
  }
}
