// src/shared/services/reporting/diagnostics/adapters/InstrumentationMiddleware.ts

import { TraceOrchestrator, TraceSession } from "../TraceOrchestrator";
import { SpanKind } from "../contracts/SpanKind";
import { TraceStatus } from "../contracts/TraceStatus";
import { DiagnosticsSeverity } from "../contracts/DiagnosticsSeverity";

/**
 * Options for instrumenting a function call with a child span.
 */
export interface InstrumentOptions {
  /** Human-readable name for the span created around the operation. */
  readonly spanName: string;

  /** SpanKind classification. */
  readonly kind: SpanKind;

  /** Optional metadata to attach to the span at creation. */
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;

  /**
   * Whether to emit a diagnostic event when the operation fails.
   * Defaults to true.
   */
  readonly emitFailureEvent?: boolean;
}

/**
 * InstrumentationMiddleware provides a collection of passive instrumentation
 * helpers that wrap async operations with diagnostic spans and events.
 *
 * Each helper intercepts execution, delegates to TraceOrchestrator to start
 * a span, runs the operation, finalizes the span, and propagates errors —
 * without altering the operation's observable behavior.
 *
 * All helpers require an active TraceSession to be in scope. If the session
 * is missing, the operation is executed directly without instrumentation.
 */
export class InstrumentationMiddleware {
  private readonly _orchestrator: TraceOrchestrator;

  constructor(orchestrator: TraceOrchestrator) {
    this._orchestrator = orchestrator;
  }

  /**
   * Wraps an async operation with a child span, recording timing and status.
   *
   * The span is started before the operation executes and finalized after
   * (regardless of success or failure). Errors are re-thrown after finalization.
   *
   * @param session - The active TraceSession.
   * @param options - Instrumentation options.
   * @param fn - The async operation to instrument.
   * @returns The resolved value of the operation.
   */
  public async instrument<T>(
    session: TraceSession,
    options: InstrumentOptions,
    fn: () => Promise<T>
  ): Promise<T> {
    const span = this._orchestrator.startSpan(session, {
      name: options.spanName,
      kind: options.kind,
      metadata: options.metadata,
    });

    try {
      const result = await fn();
      this._orchestrator.finishSpan(session, span, TraceStatus.Completed);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      this._orchestrator.finishSpan(session, span, TraceStatus.Failed, error);

      if (options.emitFailureEvent !== false) {
        this._orchestrator.emitEvent(
          session,
          `${options.spanName}.failed`,
          `Operation "${options.spanName}" failed: ${error.message}`,
          DiagnosticsSeverity.Error,
          { errorMessage: error.message }
        );
      }

      throw err;
    }
  }

  /**
   * Wraps an async operation with a span that is skipped rather than failing
   * when the operation is not available (e.g., feature flag disabled).
   *
   * The span is recorded as Skipped and the fallback value is returned.
   *
   * @param session - The active TraceSession.
   * @param options - Instrumentation options.
   * @param fn - The async operation to attempt.
   * @param fallback - Value returned when the operation is skipped.
   * @returns The operation result or the fallback value.
   */
  public async instrumentWithFallback<T>(
    session: TraceSession,
    options: InstrumentOptions,
    fn: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    const span = this._orchestrator.startSpan(session, {
      name: options.spanName,
      kind: options.kind,
      metadata: options.metadata,
    });

    try {
      const result = await fn();
      this._orchestrator.finishSpan(session, span, TraceStatus.Completed);
      return result;
    } catch {
      this._orchestrator.finishSpan(session, span, TraceStatus.Skipped);
      this._orchestrator.emitEvent(
        session,
        `${options.spanName}.fallback`,
        `Operation "${options.spanName}" fell back to default.`,
        DiagnosticsSeverity.Warning
      );
      return fallback;
    }
  }

  /**
   * Emits an informational cache-hit event on the active session.
   *
   * @param session - The active TraceSession.
   * @param cacheKey - The key that was resolved from cache.
   */
  public emitCacheHit(session: TraceSession, cacheKey: string): void {
    this._orchestrator.emitEvent(
      session,
      "cache.hit",
      `Cache hit for key: ${cacheKey}`,
      DiagnosticsSeverity.Info,
      { cacheKey }
    );
  }

  /**
   * Emits an informational cache-miss event on the active session.
   *
   * @param session - The active TraceSession.
   * @param cacheKey - The key that was not found in cache.
   */
  public emitCacheMiss(session: TraceSession, cacheKey: string): void {
    this._orchestrator.emitEvent(
      session,
      "cache.miss",
      `Cache miss for key: ${cacheKey}`,
      DiagnosticsSeverity.Info,
      { cacheKey }
    );
  }
}
