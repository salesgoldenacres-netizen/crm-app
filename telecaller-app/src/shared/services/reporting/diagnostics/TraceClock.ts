// src/shared/services/reporting/diagnostics/TraceClock.ts

/**
 * Abstraction representing time for the diagnostics tracing system.
 *
 * Enables deterministic testing by allowing injection of mock clocks
 * that return fixed or controlled timestamps, while production code
 * uses the high-precision system clock.
 *
 * All timestamps produced by TraceClock are milliseconds since the
 * Unix epoch (compatible with Date.now()).
 */
export interface TraceClock {
  /**
   * Returns the current timestamp in milliseconds since the Unix epoch.
   *
   * Implementations must be monotonic-safe: repeated calls within the
   * same synchronous context must never return a value lower than the
   * previous call.
   */
  now(): number;
}

/**
 * Production TraceClock implementation using Date.now().
 *
 * Provides millisecond-resolution timestamps. Suitable for all
 * server-side and client-side reporting executions.
 */
export class SystemTraceClock implements TraceClock {
  public now(): number {
    return Date.now();
  }
}

/**
 * Deterministic TraceClock implementation for testing.
 *
 * Returns a fixed timestamp that can be advanced manually,
 * enabling precise control over timing in unit tests.
 */
export class ManualTraceClock implements TraceClock {
  private _current: number;

  constructor(initialTimeMs: number = 0) {
    this._current = initialTimeMs;
  }

  public now(): number {
    return this._current;
  }

  /**
   * Advances the clock by the given number of milliseconds.
   * @param deltaMs - Number of milliseconds to advance.
   */
  public advance(deltaMs: number): void {
    this._current += deltaMs;
  }

  /**
   * Sets the clock to an absolute timestamp.
   * @param absoluteMs - Absolute timestamp in milliseconds since epoch.
   */
  public setTime(absoluteMs: number): void {
    this._current = absoluteMs;
  }
}
