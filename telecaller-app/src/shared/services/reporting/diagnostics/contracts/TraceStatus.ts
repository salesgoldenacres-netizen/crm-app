// src/shared/services/reporting/diagnostics/contracts/TraceStatus.ts

/**
 * Enumerated state representation for execution spans within the diagnostics framework.
 * Each span transitions through these states during its lifecycle.
 */
export enum TraceStatus {
  /** Span has been created but execution has not started. */
  Pending = "Pending",

  /** Span is actively executing. */
  Running = "Running",

  /** Span completed successfully. */
  Completed = "Completed",

  /** Span terminated with an error. */
  Failed = "Failed",

  /** Span was cancelled before or during execution. */
  Cancelled = "Cancelled",

  /** Span was intentionally skipped (e.g., feature flag off, fallback path). */
  Skipped = "Skipped",
}