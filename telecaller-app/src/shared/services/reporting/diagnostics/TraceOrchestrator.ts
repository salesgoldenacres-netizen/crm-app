// src/shared/services/reporting/diagnostics/TraceOrchestrator.ts

import { TraceId, SpanId, ExecutionId, CorrelationId } from "./contracts/Identifiers";
import { TraceSpan } from "./contracts/TraceSpan";
import { DiagnosticsEvent } from "./contracts/DiagnosticsEvent";
import { DiagnosticsContext } from "./contracts/DiagnosticsContext";
import { SpanKind } from "./contracts/SpanKind";
import { TraceStatus } from "./contracts/TraceStatus";
import { DiagnosticsSeverity } from "./contracts/DiagnosticsSeverity";
import { DiagnosticsConfiguration } from "./contracts/DiagnosticsConfiguration";
import { SpanFactory, StartSpanOptions } from "./SpanFactory";
import { DiagnosticsCollector } from "./DiagnosticsCollector";
import { DiagnosticsContextProvider } from "./DiagnosticsContextProvider";
import { TraceClock } from "./TraceClock";
import { TraceCreationError } from "./DiagnosticsErrors";

/**
 * Options for initiating a new top-level trace.
 */
export interface StartTraceOptions {
  readonly name: string;
  readonly correlationId?: CorrelationId;
  readonly configuration?: Partial<DiagnosticsConfiguration>;
}

/**
 * The active tracing session returned when a trace begins.
 * Passed to TraceOrchestrator to start nested spans and emit events.
 */
export interface TraceSession {
  readonly traceId: TraceId;
  readonly executionId: ExecutionId;
  readonly correlationId: CorrelationId;
  readonly rootSpanId: SpanId;
  readonly collector: DiagnosticsCollector;
  readonly context: DiagnosticsContext;
}

/**
 * TraceOrchestrator is the coordination hub for spans, events, and contexts.
 *
 * It orchestrates:
 * - Starting and finalizing root traces and child spans
 * - Emitting diagnostic events within an active span
 * - Propagating DiagnosticsContext through the DiagnosticsContextProvider
 * - Integrating SpanFactory and DiagnosticsCollector per execution
 *
 * TraceOrchestrator is stateless between traces — it holds no per-trace state.
 * All execution-scoped state is owned by the DiagnosticsCollector returned in
 * the TraceSession.
 */
export class TraceOrchestrator {
  private readonly _spanFactory: SpanFactory;
  private readonly _contextProvider: DiagnosticsContextProvider;
  private readonly _clock: TraceClock;
  private readonly _defaultConfig: DiagnosticsConfiguration;

  constructor(
    spanFactory: SpanFactory,
    contextProvider: DiagnosticsContextProvider,
    clock: TraceClock,
    defaultConfig: DiagnosticsConfiguration
  ) {
    this._spanFactory = spanFactory;
    this._contextProvider = contextProvider;
    this._clock = clock;
    this._defaultConfig = defaultConfig;
  }

  /**
   * Begins a new top-level trace and root span.
   *
   * Creates a TraceSession containing the collector, context, and root span.
   * The caller is responsible for passing the session to `finishTrace()` after
   * execution completes.
   *
   * @param options - Trace creation parameters.
   * @returns A TraceSession for this execution.
   */
  public startTrace(options: StartTraceOptions): TraceSession {
    const traceId = TraceId.generate();
    const executionId = ExecutionId.generate();
    const correlationId = options.correlationId ?? CorrelationId.generate();

    const config = Object.freeze({
      ...this._defaultConfig,
      ...(options.configuration ?? {}),
    });

    const rootSpan = this._spanFactory.startSpan({
      name: options.name,
      kind: SpanKind.Root,
      parentSpanId: null,
    });

    const collector = new DiagnosticsCollector();
    collector.recordSpan(rootSpan);

    const context: DiagnosticsContext = Object.freeze({
      traceId,
      executionId,
      correlationId,
      activeSpanId: rootSpan.spanId,
      configuration: config,
      createdAt: new Date(this._clock.now()).toISOString(),
    });

    return {
      traceId,
      executionId,
      correlationId,
      rootSpanId: rootSpan.spanId,
      collector,
      context,
    };
  }

  /**
   * Starts a child span within an active trace session.
   *
   * The child span is added to the session's collector. The caller must call
   * `finishSpan()` with the returned span when the child operation completes.
   *
   * @param session - The active TraceSession.
   * @param options - Child span creation parameters.
   * @returns The newly created TraceSpan.
   */
  public startSpan(session: TraceSession, options: StartSpanOptions): TraceSpan {
    const parentSpanId =
      options.parentSpanId ??
      (this._contextProvider.getContext()?.activeSpanId ?? session.rootSpanId);

    const span = this._spanFactory.startSpan({
      ...options,
      parentSpanId,
    });

    session.collector.recordSpan(span);
    return span;
  }

  /**
   * Finalizes a child span and updates the collector.
   *
   * @param session - The active TraceSession.
   * @param span - The running span to finish.
   * @param status - Optional final status. Defaults to Completed.
   * @param error - Optional error to record when status is Failed.
   * @returns The finalized, immutable TraceSpan.
   */
  public finishSpan(
    session: TraceSession,
    span: TraceSpan,
    status?: TraceStatus,
    error?: Error | null
  ): TraceSpan {
    const finalized = this._spanFactory.finishSpan({ span, status, error });
    session.collector.updateSpan(finalized);
    return finalized;
  }

  /**
   * Emits a DiagnosticsEvent within the active span of a trace session.
   *
   * @param session - The active TraceSession.
   * @param name - Machine-readable event name.
   * @param message - Human-readable description.
   * @param severity - Event severity level.
   * @param attributes - Optional structured attributes.
   */
  public emitEvent(
    session: TraceSession,
    name: string,
    message: string,
    severity: DiagnosticsSeverity = DiagnosticsSeverity.Info,
    attributes: Readonly<Record<string, string | number | boolean | null>> = {}
  ): void {
    const activeSpanId =
      this._contextProvider.getContext()?.activeSpanId ?? session.rootSpanId;

    const event: DiagnosticsEvent = Object.freeze({
      eventId: `evt_${this._clock.now()}_${Math.random().toString(36).substring(2, 7)}`,
      spanId: activeSpanId,
      correlationId: session.correlationId,
      name,
      message,
      severity,
      timestampMs: this._clock.now(),
      attributes: Object.freeze({ ...attributes }),
    });

    session.collector.recordEvent(event);
  }

  /**
   * Finalizes the root span and seals the collector.
   *
   * Must be called exactly once after the top-level execution completes.
   * After this call, no further spans or events can be recorded.
   *
   * @param session - The TraceSession to finalize.
   * @param status - Final trace status. Defaults to Completed.
   * @param error - Optional error at the trace level.
   */
  public finishTrace(
    session: TraceSession,
    status: TraceStatus = TraceStatus.Completed,
    error?: Error | null
  ): void {
    const rootSpan = session.collector.getSpans().find(
      (s) => s.spanId.value === session.rootSpanId.value
    );

    if (!rootSpan) {
      throw new TraceCreationError(
        `Root span not found in collector for trace ${session.traceId.value}`
      );
    }

    const finalizedRoot = this._spanFactory.finishSpan({
      span: rootSpan,
      status,
      error,
    });

    session.collector.updateSpan(finalizedRoot);
    session.collector.finalize();
  }
}
