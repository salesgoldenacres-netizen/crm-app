// src/shared/services/performance/pagination/contracts/CursorToken.ts
/**
 * Opaque branded CursorToken type.
 * Consumers must never inspect, construct, or cast values to this type.
 * Operations are restricted solely to the internal factory/adapter layers.
 */
export type CursorToken = string & {
  readonly __brand: "CursorToken";
};
