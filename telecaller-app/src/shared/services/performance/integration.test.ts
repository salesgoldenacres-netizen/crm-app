import { describe, it, expect } from "vitest";
import { PaginationService } from "./pagination/PaginationService";
import { LeadPageCache } from "./cache/LeadPageCache";
import { QueryOptimizer } from "./QueryOptimizer";
import { performanceMonitor } from "./performanceMonitor";
import { Lead } from "@/shared/types";

describe("Wave 8 Phase 3 Integration Validation", () => {
  it("verifies end-to-end integration between caching, pagination, optimizer, and monitor", async () => {
    // 1. Setup stateless cache and optimizer
    const cache = new LeadPageCache(5000, 10);
    performanceMonitor.reset();

    const queryOptions = {
      filters: [{ field: "status", value: "active" }],
      pageSize: 10,
    };

    // 2. Perform query analysis (stateless, side-effect free)
    const analysis = QueryOptimizer.analyze(queryOptions);
    expect(analysis.valid).toBe(true);

    // 3. Generate deterministic cache key
    const cacheKey = PaginationService.generateCacheKey("proj1", 10, undefined, [{ field: "status", value: "active" }]);
    expect(cache.get("proj1", cacheKey)).toBeUndefined();
    performanceMonitor.record({ type: "CACHE_MISS", key: cacheKey });

    // 4. Create and cache page
    const dummyPage = PaginationService.buildCursorPage<Lead>([], 10, undefined, undefined, false, false);
    cache.set("proj1", cacheKey, dummyPage);

    // 5. Subsequent call hits cache
    const cachedPage = cache.get("proj1", cacheKey);
    expect(cachedPage).toBeDefined();
    performanceMonitor.record({ type: "CACHE_HIT", key: cacheKey });

    const metrics = performanceMonitor.getMetrics();
    expect(metrics.cacheHits).toBe(1);
    expect(metrics.cacheMisses).toBe(1);
  });
});
