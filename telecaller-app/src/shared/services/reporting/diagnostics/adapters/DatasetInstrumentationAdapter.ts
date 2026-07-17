// src/shared/services/reporting/diagnostics/adapters/DatasetInstrumentationAdapter.ts

import { InstrumentationMiddleware } from "./InstrumentationMiddleware";
import { TraceSession } from "../TraceOrchestrator";
import { SpanKind } from "../contracts/SpanKind";

/**
 * Passive instrumentation adapter for the dataset pipeline.
 *
 * Wraps dataset provider fetches and execution planner batches with
 * diagnostic spans, enabling per-provider timing, cache observability,
 * and failure attribution in the diagnostics report.
 *
 * Adapter methods mirror the dataset pipeline's operation boundaries.
 * Business logic is not modified — this adapter is purely additive.
 */
export class DatasetInstrumentationAdapter {
  private readonly _middleware: InstrumentationMiddleware;

  constructor(middleware: InstrumentationMiddleware) {
    this._middleware = middleware;
  }

  /**
   * Wraps a single dataset provider fetch with a Dataset-kind span.
   *
   * @param session - The active TraceSession.
   * @param providerKey - The dataset key identifying the provider.
   * @param fn - The async fetch operation.
   */
  public async instrumentProviderFetch<T>(
    session: TraceSession,
    providerKey: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this._middleware.instrument(session, {
      spanName: `dataset.fetch[${providerKey}]`,
      kind: SpanKind.Dataset,
      metadata: { providerKey },
    }, fn);
  }

  /**
   * Wraps the full dataset execution batch with a Dataset-kind span.
   *
   * @param session - The active TraceSession.
   * @param batchIndex - The topological batch index.
   * @param providerCount - Number of providers in the batch.
   * @param fn - The async batch execution function.
   */
  public async instrumentBatch<T>(
    session: TraceSession,
    batchIndex: number,
    providerCount: number,
    fn: () => Promise<T>
  ): Promise<T> {
    return this._middleware.instrument(session, {
      spanName: `dataset.batch[${batchIndex}]`,
      kind: SpanKind.Dataset,
      metadata: { batchIndex, providerCount },
    }, fn);
  }

  /**
   * Emits a cache-hit event for a dataset provider resolution.
   */
  public emitCacheHit(session: TraceSession, providerKey: string): void {
    this._middleware.emitCacheHit(session, `dataset:${providerKey}`);
  }

  /**
   * Emits a cache-miss event for a dataset provider resolution.
   */
  public emitCacheMiss(session: TraceSession, providerKey: string): void {
    this._middleware.emitCacheMiss(session, `dataset:${providerKey}`);
  }
}
