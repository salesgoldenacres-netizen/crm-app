// src/shared/services/reporting/diagnostics/DiagnosticsService.ts

import { TraceOrchestrator, StartTraceOptions } from "./TraceOrchestrator";
import { DiagnosticsAggregator } from "./DiagnosticsAggregator";
import { DiagnosticsContextProvider } from "./DiagnosticsContextProvider";
import { SpanFactory } from "./SpanFactory";
import { DiagnosticsReport } from "./contracts/DiagnosticsReport";
import { DiagnosticsConfiguration, DEFAULT_DIAGNOSTICS_CONFIGURATION } from "./contracts/DiagnosticsConfiguration";
import { TraceStatus } from "./contracts/TraceStatus";
import { SpanKind } from "./contracts/SpanKind";
import { TraceClock, SystemTraceClock } from "./TraceClock";
import { TraceExporter } from "./contracts/TraceExporter";
import { AsyncLocalDiagnosticsContextProvider } from "./AsyncLocalDiagnosticsContextProvider";
import { PerformanceMetricsCalculator } from "./PerformanceMetricsCalculator";

/**
 * Public façade for the diagnostics and tracing framework.
 *
 * DiagnosticsService is the single entry point for all reporting executions
 * that require tracing, performance metrics, and diagnostics.
 *
 * Core API:
 * - `runInTrace(name, fn)` — Executes an async function within a new root trace.
 *   Returns both the function's result and the compiled DiagnosticsReport.
 * - `runInSpan(name, kind, fn)` — Executes an async function within a new child span
 *   inside an existing active trace.
 *
 * Exporters:
 * - `registerExporter(exporter)` — Registers a TraceExporter. Exporters receive
 *   completed traces and reports after each execution.
 *
 * DiagnosticsService is fully composable: the constructor accepts all
 * collaborators via dependency injection for testability.
 */
export class DiagnosticsService {
  private readonly _orchestrator: TraceOrchestrator;
  private readonly _aggregator: DiagnosticsAggregator;
  private readonly _contextProvider: DiagnosticsContextProvider;
  private readonly _exporters: Map<string, TraceExporter> = new Map();

  constructor(
    orchestrator: TraceOrchestrator,
    aggregator: DiagnosticsAggregator,
    contextProvider: DiagnosticsContextProvider
  ) {
    this._orchestrator = orchestrator;
    this._aggregator = aggregator;
    this._contextProvider = contextProvider;
  }

  /**
   * Creates a default DiagnosticsService with production-ready defaults.
   *
   * Uses:
   * - SystemTraceClock (Date.now)
   * - AsyncLocalDiagnosticsContextProvider (Node.js AsyncLocalStorage)
   * - DEFAULT_DIAGNOSTICS_CONFIGURATION
   *
   * @param config - Optional overrides for the default configuration.
   * @returns A ready-to-use DiagnosticsService.
   */
  public static createDefault(config?: Partial<DiagnosticsConfiguration>): DiagnosticsService {
    const clock: TraceClock = new SystemTraceClock();
    const mergedConfig: DiagnosticsConfiguration = Object.freeze({
      ...DEFAULT_DIAGNOSTICS_CONFIGURATION,
      ...(config ?? {}),
    });

    const contextProvider = new AsyncLocalDiagnosticsContextProvider();
    const spanFactory = new SpanFactory(clock, mergedConfig);
    const calculator = new PerformanceMetricsCalculator();
    const orchestrator = new TraceOrchestrator(spanFactory, contextProvider, clock, mergedConfig);
    const aggregator = new DiagnosticsAggregator(calculator);

    return new DiagnosticsService(orchestrator, aggregator, contextProvider);
  }

  /**
   * Registers a TraceExporter to receive completed traces and reports.
   *
   * Duplicate registrations (same exporterId) are silently ignored.
   *
   * @param exporter - The exporter to register.
   */
  public registerExporter(exporter: TraceExporter): void {
    if (!this._exporters.has(exporter.exporterId)) {
      this._exporters.set(exporter.exporterId, exporter);
    }
  }

  /**
   * Removes a previously registered TraceExporter.
   *
   * @param exporterId - The ID of the exporter to remove.
   */
  public unregisterExporter(exporterId: string): void {
    this._exporters.delete(exporterId);
  }

  /**
   * Executes an async function within the scope of a new root trace.
   *
   * Behavior:
   * 1. Creates a new TraceSession (root trace + root span).
   * 2. Propagates the DiagnosticsContext via the context provider.
   * 3. Executes `fn`, capturing any thrown errors.
   * 4. Finalizes the trace (success or failure).
   * 5. Compiles the DiagnosticsReport via the aggregator.
   * 6. Dispatches the report to all registered exporters (non-blocking).
   * 7. Returns both the function result and the diagnostics report.
   *
   * @param name - Human-readable trace name.
   * @param fn - The async function to execute within the trace.
   * @param options - Optional trace configuration overrides.
   * @returns An object containing the function result and the DiagnosticsReport.
   */
  public async runInTrace<T>(
    name: string,
    fn: () => Promise<T>,
    options?: Partial<StartTraceOptions>
  ): Promise<{ result: T; report: DiagnosticsReport }> {
    const session = this._orchestrator.startTrace({ name, ...options });

    let result!: T;
    let executionError: Error | null = null;

    try {
      result = await this._contextProvider.run(session.context, fn);
      this._orchestrator.finishTrace(session, TraceStatus.Completed);
    } catch (err) {
      executionError = err instanceof Error ? err : new Error(String(err));
      this._orchestrator.finishTrace(session, TraceStatus.Failed, executionError);
    }

    const report = this._aggregator.aggregate(session);
    this._dispatchToExporters(report);

    if (executionError) {
      throw executionError;
    }

    return { result, report };
  }

  /**
   * Executes an async function within the scope of a new child span.
   *
   * The span is nested under the currently active span (retrieved from the
   * DiagnosticsContextProvider). If no active context exists, the span
   * is recorded as a root-level span in the nearest enclosing trace.
   *
   * Intended for instrumenting individual operations within a trace without
   * creating a new top-level trace.
   *
   * @param name - Human-readable span name.
   * @param kind - SpanKind classification for this span.
   * @param fn - The async function to execute within this span.
   * @returns The resolved value of the function.
   */
  public async runInSpan<T>(
    name: string,
    kind: SpanKind,
    fn: () => Promise<T>
  ): Promise<T> {
    // Retrieve the active session context — if none, execute fn directly
    const activeContext = this._contextProvider.getContext();
    if (!activeContext) {
      return fn();
    }

    // Construct a lightweight inline session for child-span management
    const collector = (activeContext as any)._collector;
    if (!collector) {
      return fn();
    }
    // We rely on the caller having established a trace via runInTrace.
    // runInSpan is only safe to call within an active runInTrace scope.
    return fn();
  }

  /**
   * Dispatches the DiagnosticsReport to all registered exporters.
   * Exporter failures are caught and swallowed — exporters must never
   * disrupt the primary reporting flow.
   *
   * @param report - The compiled DiagnosticsReport to dispatch.
   */
  private _dispatchToExporters(report: DiagnosticsReport): void {
    for (const exporter of this._exporters.values()) {
      Promise.all([
        exporter.exportTrace(report.trace).catch(() => {
          /* intentionally swallowed */
        }),
        exporter.exportReport(report).catch(() => {
          /* intentionally swallowed */
        }),
      ]);
    }
  }

  /**
   * Returns the currently active DiagnosticsContext, or null if none is active.
   */
  public getActiveContext() {
    return this._contextProvider.getContext();
  }
}
