// src/shared/services/performance/performanceMonitor.ts

export type PerformanceEvent =
  | { type: "QUERY_EXECUTED"; latencyMs: number; estimatedReadCost: string }
  | { type: "CACHE_HIT"; key: string }
  | { type: "CACHE_MISS"; key: string }
  | { type: "CACHE_EVICTION"; key: string }
  | { type: "VIRTUALIZATION_CALCULATED"; rowCount: number; durationMs: number }
  | { type: "PAGINATION_COMPLETED"; durationMs: number };

export interface PerformanceMetrics {
  readonly queryCount: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly cacheEvictions: number;
  readonly averageQueryLatency: number;
  readonly averageVirtualizationDuration: number;
  readonly totalVirtualizationCalculations: number;
  readonly visibleRows: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;

  // New metrics
  private queryCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private cacheEvictions = 0;
  private totalQueryLatency = 0;
  private totalVirtualizationCalculations = 0;
  private totalVirtualizationDuration = 0;

  // Old metrics
  private domRows = 0;
  private queryLatencyMs: number | null = null;

  constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Framework-independent event collector supporting both new and old types.
   */
  public record(event: PerformanceEvent | string): void {
    if (typeof event === "string") {
      // Legacy support for string events
      if (event === "cache_hit") this.cacheHits++;
      if (event === "cache_miss") this.cacheMisses++;
      if (event === "cache_eviction") this.cacheEvictions++;
      return;
    }

    switch (event.type) {
      case "QUERY_EXECUTED":
        this.queryCount++;
        this.totalQueryLatency += event.latencyMs;
        break;
      case "CACHE_HIT":
        this.cacheHits++;
        break;
      case "CACHE_MISS":
        this.cacheMisses++;
        break;
      case "CACHE_EVICTION":
        this.cacheEvictions++;
        break;
      case "VIRTUALIZATION_CALCULATED":
        this.totalVirtualizationCalculations++;
        this.totalVirtualizationDuration += event.durationMs;
        break;
      case "PAGINATION_COMPLETED":
        break;
    }
  }

  public getMetrics(): PerformanceMetrics {
    return {
      queryCount: this.queryCount,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheEvictions: this.cacheEvictions,
      averageQueryLatency: this.queryCount > 0 ? this.totalQueryLatency / this.queryCount : 0,
      averageVirtualizationDuration:
        this.totalVirtualizationCalculations > 0
          ? this.totalVirtualizationDuration / this.totalVirtualizationCalculations
          : 0,
      totalVirtualizationCalculations: this.totalVirtualizationCalculations,
      visibleRows: this.domRows,
    };
  }

  public reset(): void {
    this.queryCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheEvictions = 0;
    this.totalQueryLatency = 0;
    this.totalVirtualizationCalculations = 0;
    this.totalVirtualizationDuration = 0;
    this.domRows = 0;
    this.queryLatencyMs = null;
  }

  // --- Legacy Backward Compatibility Layer ---
  public stats() {
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      visibleRows: this.domRows,
      queryLatencyMs: this.queryLatencyMs,
    };
  }

  public setVisibleRows(rows: number): void {
    this.domRows = rows;
  }

  public startQuery(): () => void {
    const start = Date.now();
    return () => {
      this.queryLatencyMs = Date.now() - start;
      this.record({
        type: "QUERY_EXECUTED",
        latencyMs: this.queryLatencyMs,
        estimatedReadCost: "low",
      });
    };
  }

  public health() {
    const isDegraded = this.domRows > 60;
    return {
      status: isDegraded ? "degraded" : "healthy",
      warnings: isDegraded ? ["DOM rows exceed threshold"] : [],
    };
  }

  public clear(): void {
    this.reset();
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
