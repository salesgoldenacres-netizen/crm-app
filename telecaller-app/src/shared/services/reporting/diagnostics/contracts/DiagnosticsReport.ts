// src/shared/services/reporting/diagnostics/contracts/DiagnosticsReport.ts

import { ExecutionTrace } from "./ExecutionTrace";
import { PerformanceMetrics } from "./PerformanceMetrics";
import { DiagnosticsEvent } from "./DiagnosticsEvent";
import { DiagnosticsSeverity } from "./DiagnosticsSeverity";

/**
 * A collected warning or error entry summarized in the diagnostics report.
 */
export interface DiagnosticsReportEntry {
  readonly severity: DiagnosticsSeverity;
  readonly message: string;
  readonly spanName: string | null;
  readonly timestampMs: number;
}

/**
 * Execution environment metadata captured at trace compilation time.
 */
export interface ExecutionEnvironment {
  /** Platform identifier (e.g., "node", "browser", "edge"). */
  readonly platform: string;

  /** Runtime version string (e.g., "20.11.0"). */
  readonly runtimeVersion: string | null;

  /** Hostname or worker identifier. */
  readonly hostname: string | null;

  /** Timestamp when the environment snapshot was captured. */
  readonly capturedAt: string;
}

/**
 * Immutable aggregated operational summary produced after a reporting execution
 * completes. Combines the completed ExecutionTrace with collected diagnostics,
 * performance metrics, execution environment, warnings, errors, and summaries.
 *
 * DiagnosticsReport is the final output of DiagnosticsAggregator and is the
 * primary artifact consumed by TraceExporter implementations.
 */
export interface DiagnosticsReport {
  /** Unique identifier for this diagnostics report. */
  readonly reportId: string;

  /** ISO 8601 timestamp when this report was compiled. */
  readonly compiledAt: string;

  /** The completed execution trace this report was built from. */
  readonly trace: ExecutionTrace;

  /** Derived performance metrics computed from the execution trace. */
  readonly performance: PerformanceMetrics;

  /** Execution environment snapshot captured at compilation time. */
  readonly environment: ExecutionEnvironment;

  /**
   * All warning-severity and above entries extracted from spans and events,
   * ordered chronologically.
   */
  readonly entries: readonly DiagnosticsReportEntry[];

  /**
   * Filtered warning-only entries (convenience accessor over entries).
   */
  readonly warnings: readonly DiagnosticsReportEntry[];

  /**
   * Filtered error and critical entries (convenience accessor over entries).
   */
  readonly errors: readonly DiagnosticsReportEntry[];

  /**
   * Ordered list of all diagnostic events emitted during the execution,
   * mirrored from the ExecutionTrace for direct access.
   */
  readonly events: readonly DiagnosticsEvent[];

  /**
   * Whether the overall execution completed without any failed spans
   * or error/critical events.
   */
  readonly succeeded: boolean;

  /**
   * Short, human-readable execution summary suitable for logs or dashboards.
   * Example: "Completed in 142ms — 8 spans, 0 errors"
   */
  readonly summary: string;
}
