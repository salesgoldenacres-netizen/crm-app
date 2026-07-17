// src/shared/services/reporting/diagnostics/SpanFactory.ts

import { TraceSpan } from "./contracts/TraceSpan";
import { SpanId } from "./contracts/Identifiers";
import { SpanKind } from "./contracts/SpanKind";
import { TraceStatus } from "./contracts/TraceStatus";
import { TraceClock } from "./TraceClock";
import { DiagnosticsConfiguration } from "./contracts/DiagnosticsConfiguration";

/**
 * Input parameters required to create a new TraceSpan.
 */
export interface StartSpanOptions {
  /** Human-readable name for the span. */
  readonly name: string;

  /** Classification kind of this span. */
  readonly kind: SpanKind;

  /** Optional parent span ID for establishing parent-child nesting. */
  readonly parentSpanId?: SpanId | null;

  /** Optional initial metadata to attach to the span at creation. */
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

/**
 * Parameters used to finish an existing TraceSpan.
 */
export interface FinishSpanOptions {
  /** The span to finalize. */
  readonly span: TraceSpan;

  /** Final status of the span. Defaults to Completed. */
  readonly status?: TraceStatus;

  /** Optional error to attach when status is Failed. */
  readonly error?: Error | null;

  /** Optional additional metadata to merge into the span. */
  readonly additionalMetadata?: Readonly<Record<string, string | number | boolean | null>>;
}

/**
 * Factory responsible for creating and finalizing immutable TraceSpan records.
 *
 * SpanFactory standardizes:
 * - Span ID generation
 * - Timestamp capture via the injected TraceClock
 * - Optional stack trace capture (controlled by DiagnosticsConfiguration)
 * - Immutable finalization (endTimeMs, durationMs, error, final status)
 *
 * SpanFactory has no internal state. All methods are pure functions
 * that return new frozen TraceSpan objects.
 */
export class SpanFactory {
  private readonly _clock: TraceClock;
  private readonly _config: DiagnosticsConfiguration;

  constructor(clock: TraceClock, config: DiagnosticsConfiguration) {
    this._clock = clock;
    this._config = config;
  }

  /**
   * Creates a new TraceSpan in Pending status.
   * The span's startTimeMs is set to the current clock time.
   *
   * @param options - Span creation parameters.
   * @returns A frozen, immutable TraceSpan record.
   */
  public startSpan(options: StartSpanOptions): TraceSpan {
    const spanId = SpanId.generate();
    const startTimeMs = this._clock.now();

    const creationStack =
      this._config.captureStackTraces ? new Error().stack ?? null : null;

    const span: TraceSpan = Object.freeze({
      spanId,
      parentSpanId: options.parentSpanId ?? null,
      name: options.name,
      kind: options.kind,
      status: TraceStatus.Running,
      startTimeMs,
      endTimeMs: null,
      durationMs: null,
      metadata: Object.freeze({ ...(options.metadata ?? {}) }),
      error: null,
      creationStack,
    });

    return span;
  }

  /**
   * Finalizes a TraceSpan, computing endTimeMs, durationMs, and
   * applying the final status and optional error.
   *
   * Returns a new frozen TraceSpan object. The original span is not mutated.
   *
   * @param options - Span finalization parameters.
   * @returns A frozen, immutable finalized TraceSpan record.
   */
  public finishSpan(options: FinishSpanOptions): TraceSpan {
    const { span, status, error, additionalMetadata } = options;
    const endTimeMs = this._clock.now();
    const durationMs = endTimeMs - span.startTimeMs;

    const finalStatus = status ?? TraceStatus.Completed;

    const mergedMetadata = Object.freeze({
      ...span.metadata,
      ...(additionalMetadata ?? {}),
    });

    let errorRecord: Readonly<{ message: string; stack?: string }> | null = null;
    if (error) {
      errorRecord = Object.freeze({
        message: error.message,
        stack: this._config.captureStackTraces ? error.stack : undefined,
      });
    }

    return Object.freeze({
      ...span,
      status: finalStatus,
      endTimeMs,
      durationMs,
      metadata: mergedMetadata,
      error: errorRecord,
    });
  }

  /**
   * Creates a span that is immediately cancelled without any execution time.
   * Useful for representing spans that were skipped or pre-empted before running.
   *
   * @param options - Span creation parameters.
   * @returns A frozen, immediately-cancelled TraceSpan record.
   */
  public cancelledSpan(options: StartSpanOptions): TraceSpan {
    const startTimeMs = this._clock.now();
    return Object.freeze({
      spanId: SpanId.generate(),
      parentSpanId: options.parentSpanId ?? null,
      name: options.name,
      kind: options.kind,
      status: TraceStatus.Cancelled,
      startTimeMs,
      endTimeMs: startTimeMs,
      durationMs: 0,
      metadata: Object.freeze({ ...(options.metadata ?? {}) }),
      error: null,
      creationStack: null,
    });
  }
}
