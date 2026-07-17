// src/shared/services/reporting/diagnostics/adapters/ExportInstrumentationAdapter.ts

import { InstrumentationMiddleware } from "./InstrumentationMiddleware";
import { TraceSession } from "../TraceOrchestrator";
import { SpanKind } from "../contracts/SpanKind";

/**
 * Passive instrumentation adapter for the export pipeline.
 *
 * Wraps export service orchestration and formatting driver execution
 * with Export-kind spans, providing per-format timing and serialization
 * observability.
 */
export class ExportInstrumentationAdapter {
  private readonly _middleware: InstrumentationMiddleware;

  constructor(middleware: InstrumentationMiddleware) {
    this._middleware = middleware;
  }

  /**
   * Wraps the full export service orchestration with an Export-kind span.
   */
  public async instrumentExportOrchestration<T>(
    session: TraceSession,
    formatKey: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this._middleware.instrument(session, {
      spanName: `export.orchestration[${formatKey}]`,
      kind: SpanKind.Export,
      metadata: { formatKey },
    }, fn);
  }

  /**
   * Wraps an individual export driver's serialize call with an Export-kind span.
   */
  public async instrumentDriver<T>(
    session: TraceSession,
    driverName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this._middleware.instrument(session, {
      spanName: `export.driver[${driverName}]`,
      kind: SpanKind.Export,
      metadata: { driverName },
    }, fn);
  }

  /**
   * Wraps a transformation step within the export pipeline.
   */
  public async instrumentTransformation<T>(
    session: TraceSession,
    transformName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this._middleware.instrument(session, {
      spanName: `export.transform[${transformName}]`,
      kind: SpanKind.Transformation,
      metadata: { transformName },
    }, fn);
  }
}
