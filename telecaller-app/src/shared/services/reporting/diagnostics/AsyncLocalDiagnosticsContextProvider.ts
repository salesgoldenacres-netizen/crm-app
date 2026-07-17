// src/shared/services/reporting/diagnostics/AsyncLocalDiagnosticsContextProvider.ts

import { AsyncLocalStorage } from "async_hooks";
import { DiagnosticsContextProvider } from "./DiagnosticsContextProvider";
import { DiagnosticsContext } from "./contracts/DiagnosticsContext";
import { SpanId } from "./contracts/Identifiers";

/**
 * Default Node.js implementation of DiagnosticsContextProvider using
 * AsyncLocalStorage for passive, automatic context propagation.
 *
 * AsyncLocalStorage ensures that the active DiagnosticsContext flows
 * transparently through async/await chains, Promises, and callbacks
 * without requiring explicit parameter threading or service signature changes.
 *
 * This implementation is safe for concurrent report executions: each
 * `run()` invocation establishes an isolated AsyncLocalStorage store,
 * preventing cross-talk between concurrent executions.
 *
 * Usage:
 *   const provider = new AsyncLocalDiagnosticsContextProvider();
 *   await provider.run(context, async () => {
 *     // All code here and downstream sees the same context.
 *     const ctx = provider.getContext();
 *   });
 */
export class AsyncLocalDiagnosticsContextProvider implements DiagnosticsContextProvider {
  private readonly _storage: AsyncLocalStorage<DiagnosticsContext>;

  constructor() {
    this._storage = new AsyncLocalStorage<DiagnosticsContext>();
  }

  /**
   * Executes the callback within the scope of the given DiagnosticsContext.
   * The context is automatically propagated through all async operations
   * initiated within the callback.
   */
  public async run<T>(context: DiagnosticsContext, fn: () => Promise<T>): Promise<T> {
    return this._storage.run(context, fn);
  }

  /**
   * Retrieves the DiagnosticsContext active in the current async execution scope.
   * Returns null when called outside a `run()` scope.
   */
  public getContext(): DiagnosticsContext | null {
    return this._storage.getStore() ?? null;
  }

  /**
   * Creates a derived context from the current active context with the specified
   * activeSpanId substituted. Returns null if no context is active.
   *
   * The derived context is a new immutable object — the original is not modified.
   */
  public deriveWithSpan(spanId: SpanId): DiagnosticsContext | null {
    const current = this.getContext();
    if (!current) return null;

    return Object.freeze({
      ...current,
      activeSpanId: spanId,
    });
  }
}
