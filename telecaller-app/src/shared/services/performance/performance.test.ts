import { describe, it, expect, beforeEach } from "vitest";
import { PerformanceMonitor } from "./performanceMonitor";
import { evaluateBudget, DESKTOP_BUDGETS, MOBILE_BUDGETS } from "./performanceBudgets";

// Wave 8 paginationService / leadCache / queryOptimizer stack removed in Phase F
// (no production imports). Canonical pagination: pagination/PaginationService.

describe("performanceBudgets", () => {
  it("returns PASS when value is within budget (lower-is-better)", () => {
    const result = evaluateBudget("DOM Rows", 50, DESKTOP_BUDGETS.maxDomRows);
    expect(result.result).toBe("PASS");
  });

  it("returns FAIL when value exceeds budget significantly", () => {
    const result = evaluateBudget("DOM Rows", 100, DESKTOP_BUDGETS.maxDomRows);
    expect(result.result).toBe("FAIL");
  });

  it("returns WARNING when value is within 20% over budget", () => {
    const result = evaluateBudget("DOM Rows", 68, DESKTOP_BUDGETS.maxDomRows);
    expect(result.result).toBe("WARNING");
  });

  it("returns PASS for min FPS (higher-is-better)", () => {
    const result = evaluateBudget("Scroll FPS", 60, DESKTOP_BUDGETS.minScrollFps, false);
    expect(result.result).toBe("PASS");
  });

  it("DESKTOP_BUDGETS has correct maxPageSize", () => {
    expect(DESKTOP_BUDGETS.maxPageSize).toBe(50);
    expect(MOBILE_BUDGETS.maxPageSize).toBe(50);
  });
});

describe("PerformanceMonitor", () => {
  let monitor: PerformanceMonitor;
  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  it("starts with empty stats", () => {
    const stats = monitor.stats();
    expect(stats.cacheHits).toBe(0);
    expect(stats.cacheMisses).toBe(0);
    expect(stats.visibleRows).toBe(0);
  });

  it("records cache hits and misses", () => {
    monitor.record("cache_hit");
    monitor.record("cache_hit");
    monitor.record("cache_miss");
    const stats = monitor.stats();
    expect(stats.cacheHits).toBe(2);
    expect(stats.cacheMisses).toBe(1);
  });

  it("setVisibleRows updates stats", () => {
    monitor.setVisibleRows(42);
    expect(monitor.stats().visibleRows).toBe(42);
  });

  it("startQuery returns an end function that records duration", () => {
    const end = monitor.startQuery();
    end();
    expect(monitor.stats().queryLatencyMs).not.toBeNull();
  });

  it("health is healthy when budgets pass", () => {
    monitor.setVisibleRows(30);
    expect(monitor.health().status).toBe("healthy");
  });

  it("health is degraded when DOM rows exceed budget", () => {
    monitor.setVisibleRows(200);
    expect(monitor.health().status).toBe("degraded");
  });

  it("clear resets all state", () => {
    monitor.record("cache_hit");
    monitor.setVisibleRows(50);
    monitor.clear();
    const stats = monitor.stats();
    expect(stats.cacheHits).toBe(0);
    expect(stats.visibleRows).toBe(0);
  });
});
