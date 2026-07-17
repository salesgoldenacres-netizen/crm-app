import { describe, it, expect, beforeEach } from "vitest";
import {
  validatePageSize,
  CursorStack,
  PaginationError,
  type CursorToken,
} from "./paginationService";
import { LeadCache } from "./leadCache";
import { PerformanceMonitor } from "./performanceMonitor";
import { validateQuery, type QueryDescriptor } from "./query/QueryValidator";
import { planQuery } from "./query/QueryPlanner";
import { analyzeQuery } from "./query/QueryAnalyzer";
import { optimizeQuery } from "./query/queryOptimizer";
import { evaluateBudget, DESKTOP_BUDGETS, MOBILE_BUDGETS } from "./performanceBudgets";

// ─── Performance Budgets ───────────────────────────────────────────────────────

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
    const result = evaluateBudget("DOM Rows", 68, DESKTOP_BUDGETS.maxDomRows); // 60 * 1.2 = 72
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

// ─── Pagination Service ────────────────────────────────────────────────────────

describe("paginationService", () => {
  it("rejects page size > MAX_PAGE_SIZE", () => {
    expect(() => validatePageSize(51)).toThrow(PaginationError);
  });

  it("accepts page size === MAX_PAGE_SIZE", () => {
    expect(() => validatePageSize(50)).not.toThrow();
  });

  it("rejects page size of 0", () => {
    expect(() => validatePageSize(0)).toThrow(PaginationError);
  });

  it("throws descriptive error message", () => {
    try {
      validatePageSize(100);
    } catch (e) {
      expect((e as PaginationError).message).toContain("100");
      expect((e as PaginationError).message).toContain("50");
    }
  });

  describe("CursorStack", () => {
    let stack: CursorStack;
    beforeEach(() => { stack = new CursorStack(); });

    it("starts empty", () => {
      expect(stack.depth).toBe(0);
      expect(stack.peek()).toBeUndefined();
    });

    it("push/pop preserves order", () => {
      const t1 = "token1" as CursorToken;
      const t2 = "token2" as CursorToken;
      stack.push(t1);
      stack.push(t2);
      expect(stack.pop()).toBe(t2);
      expect(stack.pop()).toBe(t1);
      expect(stack.depth).toBe(0);
    });

    it("clear empties the stack", () => {
      stack.push("t1" as CursorToken);
      stack.clear();
      expect(stack.depth).toBe(0);
    });
  });
});

// ─── LeadCache ────────────────────────────────────────────────────────────────

describe("LeadCache", () => {
  let cache: LeadCache<string[]>;
  beforeEach(() => { cache = new LeadCache({ capacity: 3, ttlMs: 60_000 }); });

  it("returns null for cache miss", () => {
    expect(cache.get("p1", "first")).toBeNull();
  });

  it("returns data for cache hit after put", () => {
    cache.put("p1", "first", ["a", "b"]);
    expect(cache.get("p1", "first")).toEqual(["a", "b"]);
  });

  it("tracks hits and misses correctly", () => {
    cache.get("p1", "first"); // miss
    cache.put("p1", "first", ["x"]);
    cache.get("p1", "first"); // hit
    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it("evicts LRU when capacity is exceeded", () => {
    const t1 = "t1" as CursorToken;
    const t2 = "t2" as CursorToken;
    const t3 = "t3" as CursorToken;
    const t4 = "t4" as CursorToken;
    cache.put("p1", t1, ["a"]);
    cache.put("p1", t2, ["b"]);
    cache.put("p1", t3, ["c"]);
    cache.put("p1", t4, ["d"]); // Should evict t1
    expect(cache.get("p1", t1)).toBeNull();
    expect(cache.get("p1", t4)).toEqual(["d"]);
    const stats = cache.stats();
    expect(stats.evictions).toBeGreaterThan(0);
  });

  it("clearProject removes only that project's entries", () => {
    cache.put("p1", "first", ["p1data"]);
    cache.put("p2", "first", ["p2data"]);
    cache.clearProject("p1");
    expect(cache.get("p1", "first")).toBeNull();
    expect(cache.get("p2", "first")).toEqual(["p2data"]);
  });

  it("stats includes memoryEstimate > 0", () => {
    cache.put("p1", "first", ["hello", "world"]);
    expect(cache.stats().memoryEstimate).toBeGreaterThan(0);
  });

  it("occupancy respects capacity", () => {
    const entries = [1, 2, 3, 4].map(String) as unknown as CursorToken[];
    entries.forEach((t, i) => cache.put("p1", t, [`item${i}`]));
    expect(cache.stats().occupancy).toBeLessThanOrEqual(3);
  });

  it("health returns degraded when hit ratio is low", () => {
    // 0 hits, 20 misses
    for (let i = 0; i < 20; i++) {
      cache.get("p1", `miss${i}` as CursorToken);
    }
    expect(cache.health().status).toBe("degraded");
  });

  it("dispose clears cache", () => {
    cache.put("p1", "first", ["data"]);
    cache.dispose();
    expect(cache.get("p1", "first")).toBeNull();
  });
});

// ─── Query Validator ──────────────────────────────────────────────────────────

describe("QueryValidator", () => {
  const base: QueryDescriptor = {
    collection: "leads",
    filters: [{ field: "projectId", operator: "==", value: "p1" }],
    pageSize: 20,
  };

  it("accepts a valid query", () => {
    const result = validateQuery(base);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects page size > 50", () => {
    const result = validateQuery({ ...base, pageSize: 51 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("50"))).toBe(true);
  });

  it("rejects short search terms", () => {
    const result = validateQuery({ ...base, searchTerm: "ab" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("3"))).toBe(true);
  });

  it("accepts search terms of minimum length", () => {
    const result = validateQuery({ ...base, searchTerm: "abc" });
    expect(result.valid).toBe(true);
  });

  it("rejects unbounded collection reads", () => {
    const result = validateQuery({ ...base, filters: [], searchTerm: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Unbounded"))).toBe(true);
  });
});

// ─── Query Planner ────────────────────────────────────────────────────────────

describe("QueryPlanner", () => {
  it("normalizes filters: equality filters before range filters", () => {
    const descriptor: QueryDescriptor = {
      collection: "leads",
      filters: [
        { field: "createdAt", operator: ">", value: "2024-01-01" },
        { field: "projectId", operator: "==", value: "p1" },
      ],
      pageSize: 20,
    };
    const plan = planQuery(descriptor);
    expect(plan.filters[0].operator).toBe("==");
    expect(plan.filters[1].operator).toBe(">");
  });

  it("sets fetchSize to pageSize + 1 for hasNextPage detection", () => {
    const descriptor: QueryDescriptor = {
      collection: "leads",
      filters: [{ field: "projectId", operator: "==", value: "p1" }],
      pageSize: 20,
    };
    const plan = planQuery(descriptor);
    expect(plan.fetchSize).toBe(21);
  });

  it("normalizes search term to lowercase trimmed", () => {
    const descriptor: QueryDescriptor = {
      collection: "leads",
      filters: [{ field: "projectId", operator: "==", value: "p1" }],
      pageSize: 20,
      searchTerm: "  HELLO  ",
    };
    const plan = planQuery(descriptor);
    expect(plan.searchTerm).toBe("hello");
  });
});

// ─── Query Analyzer ───────────────────────────────────────────────────────────

describe("QueryAnalyzer", () => {
  it("returns low cost for a well-indexed query", () => {
    const plan = planQuery({
      collection: "leads",
      filters: [{ field: "projectId", operator: "==", value: "p1" }],
      pageSize: 20,
    });
    const analysis = analyzeQuery(plan);
    expect(analysis.estimatedReadCost).toBe("low");
  });

  it("returns high cost for unbounded query", () => {
    const plan = planQuery({
      collection: "leads",
      filters: [],
      pageSize: 20,
    });
    const analysis = analyzeQuery(plan);
    expect(analysis.estimatedReadCost).toBe("high");
  });

  it("warns on not-in filter", () => {
    const plan = planQuery({
      collection: "leads",
      filters: [{ field: "status", operator: "not-in", value: ["dead"] }],
      pageSize: 20,
    });
    const analysis = analyzeQuery(plan);
    expect(analysis.warnings.some((w) => w.includes("not-in"))).toBe(true);
  });

  it("never mutates the plan", () => {
    const plan = planQuery({
      collection: "leads",
      filters: [{ field: "projectId", operator: "==", value: "p1" }],
      pageSize: 20,
    });
    const original = JSON.stringify(plan);
    analyzeQuery(plan);
    expect(JSON.stringify(plan)).toBe(original);
  });
});

// ─── QueryOptimizer Facade ────────────────────────────────────────────────────

describe("queryOptimizer", () => {
  it("returns valid=false for invalid query without executing", () => {
    const result = optimizeQuery({
      collection: "leads",
      filters: [],
      pageSize: 100,
    });
    expect(result.valid).toBe(false);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  it("returns valid=true for a valid query with analysis", () => {
    const result = optimizeQuery({
      collection: "leads",
      filters: [{ field: "projectId", operator: "==", value: "p1" }],
      pageSize: 20,
    });
    expect(result.valid).toBe(true);
    expect(result.plan).toBeDefined();
    expect(result.estimatedReadCost).toBeDefined();
  });
});

// ─── PerformanceMonitor ───────────────────────────────────────────────────────

describe("PerformanceMonitor", () => {
  let monitor: PerformanceMonitor;
  beforeEach(() => { monitor = new PerformanceMonitor(); });

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
