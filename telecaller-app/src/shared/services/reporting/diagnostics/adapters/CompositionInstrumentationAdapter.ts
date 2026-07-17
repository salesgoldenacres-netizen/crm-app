// src/shared/services/reporting/diagnostics/adapters/CompositionInstrumentationAdapter.ts

import { InstrumentationMiddleware } from "./InstrumentationMiddleware";
import { TraceSession } from "../TraceOrchestrator";
import { SpanKind } from "../contracts/SpanKind";

/**
 * Passive instrumentation adapter for the composition pipeline.
 *
 * Wraps composition pipeline execution and individual section builder
 * operations with diagnostic spans, providing per-section timing and
 * dependency resolution observability.
 */
export class CompositionInstrumentationAdapter {
  private readonly _middleware: InstrumentationMiddleware;

  constructor(middleware: InstrumentationMiddleware) {
    this._middleware = middleware;
  }

  /**
   * Wraps the full composition pipeline execution with a Composition-kind span.
   */
  public async instrumentCompositionPipeline<T>(
    session: TraceSession,
    templateName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this._middleware.instrument(session, {
      spanName: `composition.pipeline[${templateName}]`,
      kind: SpanKind.Composition,
      metadata: { templateName },
    }, fn);
  }

  /**
   * Wraps an individual section builder execution with a Builder-kind span.
   */
  public async instrumentSectionBuilder<T>(
    session: TraceSession,
    builderKey: string,
    sectionName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this._middleware.instrument(session, {
      spanName: `builder[${builderKey}].${sectionName}`,
      kind: SpanKind.Builder,
      metadata: { builderKey, sectionName },
    }, fn);
  }

  /**
   * Wraps a topological batch of section builders with a Composition-kind span.
   */
  public async instrumentBuilderBatch<T>(
    session: TraceSession,
    batchIndex: number,
    builderCount: number,
    fn: () => Promise<T>
  ): Promise<T> {
    return this._middleware.instrument(session, {
      spanName: `composition.batch[${batchIndex}]`,
      kind: SpanKind.Composition,
      metadata: { batchIndex, builderCount },
    }, fn);
  }
}
