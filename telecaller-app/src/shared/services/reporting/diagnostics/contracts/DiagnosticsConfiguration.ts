// src/shared/services/reporting/diagnostics/contracts/DiagnosticsConfiguration.ts

export interface DiagnosticsConfiguration {
  readonly timingEnabled: boolean;
  readonly captureStackTraces: boolean;
  readonly captureArguments: boolean;
  readonly captureResults: boolean;
  readonly captureMetadata: boolean;
  readonly capturePerformance: boolean;
  readonly captureEvents: boolean;
  readonly captureExceptions: boolean;
  readonly samplingRate: number; // 0.0 to 1.0
  readonly samplingStrategy?: "always" | "never" | "random";
}

export const DEFAULT_DIAGNOSTICS_CONFIGURATION: DiagnosticsConfiguration = {
  timingEnabled: true,
  captureStackTraces: true,
  captureArguments: false,
  captureResults: false,
  captureMetadata: true,
  capturePerformance: true,
  captureEvents: true,
  captureExceptions: true,
  samplingRate: 1.0,
  samplingStrategy: "always"
};
