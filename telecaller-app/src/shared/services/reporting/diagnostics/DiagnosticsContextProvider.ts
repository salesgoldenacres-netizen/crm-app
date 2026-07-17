// src/shared/services/reporting/diagnostics/DiagnosticsContextProvider.ts

import { DiagnosticsContext } from "./contracts/DiagnosticsContext";

/**
 * Contract for propagating and accessing the active DiagnosticsContext
 * throughout reporting executions.
 *
 * The reporting architecture depends exclusively on this abstraction and
 * remains independent of any runtime-specific implementation
 * (AsyncLocalStorage, React context, manual threading, etc.).
 *
 * Lifecycle:
 * 1. `run(context, fn)` — Establishes the given context as the active context
 *    for the duration of the callback `fn` and all code called within it.
 * 2. `getContext()` — Retrieves the currently active context. Returns null
 *    when called outside an active run scope.
 * 3. `withSpan(spanId)` — Creates a derived context with the given activeSpanId,
 *    used when entering a nested span within an existing execution.
 */
export interface DiagnosticsContextProvider {
  /**
   * Executes the given async callback within the scope of the provided context.
   * All calls to `getContext()` made within the callback (and its callees)
   * will return this context.
   *
   * @param context - The context to activate for the duration of the callback.
   * @param fn - The async callback to execute.
   * @returns The resolved value of the callback.
   */
  run<T>(context: DiagnosticsContext, fn: () => Promise<T>): Promise<T>;

  /**
   * Returns the currently active DiagnosticsContext, or null if no context
   * has been established for the current execution scope.
   */
  getContext(): DiagnosticsContext | null;

  /**
   * Creates a new context derived from the active context with the specified
   * activeSpanId updated. The caller is responsible for running within the
   * derived context using `run()`.
   *
   * Returns null if there is no active context.
   *
   * @param spanId - The SpanId of the newly entered span.
   */
  deriveWithSpan(spanId: import("./contracts/Identifiers").SpanId): DiagnosticsContext | null;
}
