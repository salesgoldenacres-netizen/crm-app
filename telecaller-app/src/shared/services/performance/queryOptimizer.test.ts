import { describe, it, expect } from "vitest";
import { QueryOptimizer } from "./QueryOptimizer";
import { QueryOptimizationOptions } from "./contracts/QueryOptimizationOptions";

describe("Wave 8 Phase 2D-D QueryOptimizer", () => {
  it("passes valid query shape checks with low read cost", () => {
    const options: QueryOptimizationOptions = {
      filters: [],
      pageSize: 15,
    };
    const analysis = QueryOptimizer.analyze(options);
    expect(analysis.valid).toBe(true);
    expect(analysis.warnings).toHaveLength(0);
    expect(analysis.estimatedReadCost).toBe("low");
  });

  it("warns and fails validation when page size exceeds 50", () => {
    const options: QueryOptimizationOptions = {
      filters: [],
      pageSize: 55,
    };
    const analysis = QueryOptimizer.analyze(options);
    expect(analysis.valid).toBe(false);
    expect(analysis.warnings[0]).toContain("exceeds maximum permitted limit");
    expect(analysis.estimatedReadCost).toBe("high");
  });

  it("warns about short search query length (< 3 chars)", () => {
    const options: QueryOptimizationOptions = {
      filters: [],
      pageSize: 10,
      search: "ab",
    };
    const analysis = QueryOptimizer.analyze(options);
    expect(analysis.valid).toBe(true);
    expect(analysis.warnings[0]).toContain("Search query");
    expect(analysis.warnings[0]).toContain("too short");
  });

  it("identifies composite indexes and client-side sorting warnings", () => {
    const options: QueryOptimizationOptions = {
      filters: [{ field: "status" }, { field: "priority" }],
      pageSize: 20,
      sort: "createdAt",
    };
    const analysis = QueryOptimizer.analyze(options);
    expect(analysis.valid).toBe(true);
    expect(analysis.warnings[0]).toContain("Sorting by");
    expect(analysis.requiredIndexes).toContain("createdAt");
    expect(analysis.requiredIndexes).toContain("status");
    expect(analysis.requiredIndexes).toContain("priority");
  });

  it("identifies high read cost for complex filtered requests", () => {
    const options: QueryOptimizationOptions = {
      filters: [
        { field: "status" },
        { field: "priority" },
        { field: "project" },
        { field: "leadStatus" },
      ],
      pageSize: 10,
    };
    const analysis = QueryOptimizer.analyze(options);
    expect(analysis.estimatedReadCost).toBe("high");
    expect(analysis.warnings[0]).toContain("High number of query filters");
  });
});
