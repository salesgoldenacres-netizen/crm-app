// src/shared/services/reporting/diagnostics/contracts/TraceExporter.ts

import { ExecutionTrace } from "./ExecutionTrace";
import { DiagnosticsReport } from "./DiagnosticsReport";

/**
 * Extensible contract for writing or dispatching execution traces and
 * diagnostics reports to destination backends.
 *
 * Implementations are decoupled from the core tracing engine and may target:
 * - Console / structured logging
 * - JSON serialization to file or stream
 * - OpenTelemetry collector
 * - Firebase Cloud Logging / Cloud Monitoring
 * - In-memory sinks (primarily for testing)
 *
 * Exporters are passive — they observe and write; they must never mutate
 * the trace or report they receive.
 */
export interface TraceExporter {
  /**
   * Unique, machine-readable identifier for this exporter.
   * Used for registration deduplication and filtering.
   */
  readonly exporterId: string;

  /**
   * Human-readable display name for this exporter.
   */
  readonly displayName: string;

  /**
   * Called after an ExecutionTrace is completed (regardless of status).
   * Implementations should be non-throwing; errors during export must be
   * caught and handled internally to avoid disrupting the reporting pipeline.
   *
   * @param trace - The completed, immutable execution trace.
   */
  exportTrace(trace: ExecutionTrace): Promise<void>;

  /**
   * Called after a DiagnosticsReport has been fully compiled.
   * Provides a richer, aggregated view compared to exportTrace.
   *
   * @param report - The fully compiled, immutable diagnostics report.
   */
  exportReport(report: DiagnosticsReport): Promise<void>;
}
