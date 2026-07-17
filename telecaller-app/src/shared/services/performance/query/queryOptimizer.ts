/**
 * queryOptimizer (Wave 8 Phase 2D) — Public Facade
 * Simple entry point into the three-part optimizer pipeline.
 * Returns a QueryAnalysis. The caller always decides whether to execute.
 * Never auto-fixes, never mutates the query.
 */

export { type QueryDescriptor, type FilterCondition, type SortCondition } from "./QueryValidator";
export { type QueryPlan } from "./QueryPlanner";
export { type QueryAnalysis, type ReadCost } from "./QueryAnalyzer";

import { validateQuery, QueryDescriptor } from "./QueryValidator";
import { planQuery } from "./QueryPlanner";
import { analyzeQuery, QueryAnalysis } from "./QueryAnalyzer";
import { CursorToken } from "@/shared/services/performance/paginationService";

export interface OptimizerResult extends QueryAnalysis {
  /** True only when validation passed. Caller checks this before executing. */
  valid: boolean;
  validationErrors: string[];
}

/**
 * Run the full pipeline: validate → plan → analyze.
 * Returns an OptimizerResult the caller inspects before executing any query.
 */
export function optimizeQuery(
  descriptor: QueryDescriptor,
  startAfterCursor?: CursorToken
): OptimizerResult {
  const validation = validateQuery(descriptor);
  if (!validation.valid) {
    return {
      valid: false,
      validationErrors: validation.errors,
      // Provide a stub plan so callers don't have to null-check.
      plan: {
        collection: descriptor.collection,
        filters: descriptor.filters,
        sort: descriptor.sort,
        fetchSize: descriptor.pageSize + 1,
        startAfterCursor,
      },
      warnings: validation.errors,
      requiredIndexes: [],
      estimatedReadCost: "high",
    };
  }

  const plan = planQuery(descriptor, startAfterCursor);
  const analysis = analyzeQuery(plan);

  return {
    valid: true,
    validationErrors: [],
    ...analysis,
  };
}
