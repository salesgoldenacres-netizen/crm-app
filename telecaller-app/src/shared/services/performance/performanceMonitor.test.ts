import { describe, it, expect, beforeEach } from "vitest";
import { PerformanceMonitor } from "./performanceMonitor";

describe("Wave 8 Phase 2D-D PerformanceMonitor", () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    monitor.reset();
  });

  it("gathers query executed event metrics successfully", () => {
    monitor.record({ type: "QUERY_EXECUTED", latencyMs: 250, estimatedReadCost: "low" });
    monitor.record({ type: "QUERY_EXECUTED", latencyMs: 150, estimatedReadCost: "medium" });

    const metrics = monitor.getMetrics();
    expect(metrics.queryCount).toBe(2);
    expect(metrics.averageQueryLatency).toBe(200);
  });

  it("accumulates cache stats metrics", () => {
    monitor.record({ type: "CACHE_HIT", key: "k1" });
    monitor.record({ type: "CACHE_MISS", key: "k2" });
    monitor.record({ type: "CACHE_EVICTION", key: "k3" });

    const metrics = monitor.getMetrics();
    expect(metrics.cacheHits).toBe(1);
    expect(metrics.cacheMisses).toBe(1);
    expect(metrics.cacheEvictions).toBe(1);
  });

  it("aggregates virtualization calculation metrics", () => {
    monitor.record({ type: "VIRTUALIZATION_CALCULATED", rowCount: 100, durationMs: 15 });
    monitor.record({ type: "VIRTUALIZATION_CALCULATED", rowCount: 100, durationMs: 25 });

    const metrics = monitor.getMetrics();
    expect(metrics.totalVirtualizationCalculations).toBe(2);
    expect(metrics.averageVirtualizationDuration).toBe(20);
  });

  it("resets metrics accurately on reset", () => {
    monitor.record({ type: "CACHE_HIT", key: "k1" });
    monitor.reset();

    const metrics = monitor.getMetrics();
    expect(metrics.cacheHits).toBe(0);
  });
});
