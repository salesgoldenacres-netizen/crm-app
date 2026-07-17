// src/shared/services/reporting/diagnostics/contracts/DiagnosticsSeverity.ts

/**
 * Severity level for diagnostics events and report entries.
 * Levels are ordered from lowest (Info) to highest (Critical).
 */
export enum DiagnosticsSeverity {
  /** Informational observation with no impact on execution health. */
  Info = "Info",

  /** Non-blocking issue that may degrade quality or indicate a potential problem. */
  Warning = "Warning",

  /** A recoverable error that affected part of the execution. */
  Error = "Error",

  /** A severe, potentially unrecoverable failure impacting the entire execution. */
  Critical = "Critical",
}