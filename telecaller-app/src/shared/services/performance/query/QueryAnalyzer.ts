/**
 * QueryAnalyzer (Wave 8 Phase 2D)
 * Responsibility: Produce warnings, cost estimates, and index requirements for a plan.
 * Never mutates the plan. Caller decides whether to execute.
 */

import { QueryPlan } from "./QueryPlanner";
import { DESKTOP_BUDGETS } from "@/shared/services/performance/performanceBudgets";

export type ReadCost = "low" | "medium" | "high";

export interface QueryAnalysis {
  plan: QueryPlan;
  warnings: string[];
  requiredIndexes: string[];
  estimatedReadCost: ReadCost;
}

/** Known composite index field combinations. */
const INDEXED_COMBINATIONS: string[][] = [
  ["projectId", "status"],
  ["projectId", "assignedTo"],
  ["projectId", "createdAt"],
  ["projectId", "status", "assignedTo"],
  ["projectId", "followUpDate"],
];

function estimateCost(plan: QueryPlan): ReadCost {
  if (plan.filters.length === 0) return "high";
  if (plan.fetchSize > DESKTOP_BUDGETS.maxPageSize) return "high";
  if (plan.filters.some((f) => ["in", "not-in"].includes(f.operator))) return "medium";
  return "low";
}

function detectMissingIndexes(plan: QueryPlan): string[] {
  if (!plan.sort) return [];
  const filterFields = plan.filters.map((f) => f.field);
  const allFields = [...filterFields, plan.sort.field];
  const covered = INDEXED_COMBINATIONS.some((combo) =>
    allFields.every((f) => combo.includes(f))
  );
  if (!covered) {
    return [`Composite index recommended: [${allFields.join(", ")}]`];
  }
  return [];
}

export function analyzeQuery(plan: QueryPlan): QueryAnalysis {
  const warnings: string[] = [];
  const requiredIndexes = detectMissingIndexes(plan);

  // Warn on high-cardinality "in" / "not-in" operators
  plan.filters.forEach((f) => {
    if (f.operator === "in" && Array.isArray(f.value) && (f.value as unknown[]).length > 10) {
      warnings.push(
        `"in" filter on "${f.field}" with ${(f.value as unknown[]).length} values may be slow. Consider splitting into multiple queries.`
      );
    }
    if (f.operator === "not-in") {
      warnings.push(
        `"not-in" filter on "${f.field}" scans the entire collection. High read cost.`
      );
    }
  });

  // Warn on missing indexes
  if (requiredIndexes.length > 0) {
    warnings.push(...requiredIndexes.map((idx) => `Missing index: ${idx}`));
  }

  // Warn on large fetch sizes
  if (plan.fetchSize > DESKTOP_BUDGETS.maxPageSize + 1) {
    warnings.push(`Fetch size ${plan.fetchSize - 1} exceeds recommended page size.`);
  }

  return {
    plan,
    warnings,
    requiredIndexes,
    estimatedReadCost: estimateCost(plan),
  };
}
