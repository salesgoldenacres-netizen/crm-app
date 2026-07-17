// src/shared/services/reporting/diagnostics/adapters/DeliveryInstrumentationAdapter.ts

import { InstrumentationMiddleware } from "./InstrumentationMiddleware";
import { TraceSession } from "../TraceOrchestrator";
import { SpanKind } from "../contracts/SpanKind";

/**
 * Passive instrumentation adapter for the delivery pipeline.
 *
 * Wraps delivery service orchestration and provider-level transport operations
 * with Delivery-kind spans, providing per-channel timing and failure attribution.
 */
export class DeliveryInstrumentationAdapter {
  private readonly _middleware: InstrumentationMiddleware;

  constructor(middleware: InstrumentationMiddleware) {
    this._middleware = middleware;
  }

  /**
   * Wraps the full delivery service orchestration with a Delivery-kind span.
   */
  public async instrumentDeliveryOrchestration<T>(
    session: TraceSession,
    channelKey: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this._middleware.instrument(session, {
      spanName: `delivery.orchestration[${channelKey}]`,
      kind: SpanKind.Delivery,
      metadata: { channelKey },
    }, fn);
  }

  /**
   * Wraps an individual delivery provider's transport call with a Delivery-kind span.
   */
  public async instrumentProvider<T>(
    session: TraceSession,
    providerName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this._middleware.instrument(session, {
      spanName: `delivery.provider[${providerName}]`,
      kind: SpanKind.Delivery,
      metadata: { providerName },
    }, fn);
  }

  /**
   * Wraps a delivery fallback path (e.g., retry to alternate channel).
   */
  public async instrumentFallback<T>(
    session: TraceSession,
    originalChannel: string,
    fallbackChannel: string,
    fn: () => Promise<T>,
    fallbackValue: T
  ): Promise<T> {
    return this._middleware.instrumentWithFallback(
      session,
      {
        spanName: `delivery.fallback[${originalChannel}->${fallbackChannel}]`,
        kind: SpanKind.Delivery,
        metadata: { originalChannel, fallbackChannel },
      },
      fn,
      fallbackValue
    );
  }
}
