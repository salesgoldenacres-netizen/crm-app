// src/shared/services/reporting/diagnostics/DiagnosticsCollector.ts

import { TraceSpan } from "./contracts/TraceSpan";
import { DiagnosticsEvent } from "./contracts/DiagnosticsEvent";
import { DiagnosticsCollectionError } from "./DiagnosticsErrors";

/**
 * Execution-scoped accumulator for TraceSpan and DiagnosticsEvent records.
 *
 * Each reporting execution owns exactly one DiagnosticsCollector.
 * Concurrent executions never share collectors, eliminating cross-talk
 * and synchronization requirements between executions.
 *
 * The collector is NOT responsible for aggregation or analysis.
 * It solely accumulates raw observations in chronological order.
 *
 * After the execution completes, DiagnosticsAggregator reads the
 * collector's accumulated data to compile the immutable DiagnosticsReport.
 *
 * Finalization:
 * - Once `finalize()` is called, the collector becomes sealed.
 * - Subsequent calls to `recordSpan` or `recordEvent` throw DiagnosticsCollectionError.
 */
export class DiagnosticsCollector {
  private readonly _spans: TraceSpan[] = [];
  private readonly _events: DiagnosticsEvent[] = [];
  private _finalized: boolean = false;

  /**
   * Records an immutable TraceSpan into the collector's ordered span list.
   *
   * Spans may be recorded in any order during execution (e.g., when a
   * finished span replaces a running span). The aggregator is responsible
   * for chronological ordering in the final report.
   *
   * @throws DiagnosticsCollectionError if the collector has been finalized.
   */
  public recordSpan(span: TraceSpan): void {
    if (this._finalized) {
      throw new DiagnosticsCollectionError(
        `Cannot record span "${span.name}" — collector has been finalized.`
      );
    }
    this._spans.push(span);
  }

  /**
   * Updates an existing span in the collector, replacing the span with the
   * matching spanId with the provided updated span.
   *
   * This is used when a span is first recorded in Running state and then
   * finalized (Completed/Failed). The running entry is replaced by the
   * finalized entry.
   *
   * If no span with the given spanId is found, the updated span is appended.
   *
   * @throws DiagnosticsCollectionError if the collector has been finalized.
   */
  public updateSpan(updatedSpan: TraceSpan): void {
    if (this._finalized) {
      throw new DiagnosticsCollectionError(
        `Cannot update span "${updatedSpan.name}" — collector has been finalized.`
      );
    }
    const index = this._spans.findIndex(
      (s) => s.spanId.value === updatedSpan.spanId.value
    );
    if (index !== -1) {
      this._spans[index] = updatedSpan;
    } else {
      this._spans.push(updatedSpan);
    }
  }

  /**
   * Records an immutable DiagnosticsEvent into the collector's ordered event list.
   *
   * @throws DiagnosticsCollectionError if the collector has been finalized.
   */
  public recordEvent(event: DiagnosticsEvent): void {
    if (this._finalized) {
      throw new DiagnosticsCollectionError(
        `Cannot record event "${event.name}" — collector has been finalized.`
      );
    }
    this._events.push(event);
  }

  /**
   * Returns a snapshot of all accumulated spans, ordered as they were recorded.
   * The returned array is a shallow copy and safe to iterate without holding a lock.
   */
  public getSpans(): readonly TraceSpan[] {
    return [...this._spans];
  }

  /**
   * Returns a snapshot of all accumulated events, ordered as they were recorded.
   * The returned array is a shallow copy and safe to iterate without holding a lock.
   */
  public getEvents(): readonly DiagnosticsEvent[] {
    return [...this._events];
  }

  /**
   * Returns true if the collector has been finalized.
   */
  public get isFinalized(): boolean {
    return this._finalized;
  }

  /**
   * Seals the collector against further recording.
   * Subsequent calls to recordSpan or recordEvent will throw DiagnosticsCollectionError.
   *
   * Calling finalize() more than once is a no-op.
   */
  public finalize(): void {
    this._finalized = true;
  }
}
