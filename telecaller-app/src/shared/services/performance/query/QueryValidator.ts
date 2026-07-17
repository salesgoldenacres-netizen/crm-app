/**
 * QueryValidator (Wave 8 Phase 2D)
 * Responsibility: Is this query legal to execute?
 * Returns validation errors. Never mutates or rewrites the query.
 */

import { DESKTOP_BUDGETS } from "@/shared/services/performance/performanceBudgets";

export interface FilterCondition {
  field: string;
  operator: "==" | "!=" | "<" | "<=" | ">" | ">=" | "array-contains" | "in" | "not-in";
  value: unknown;
}

export interface SortCondition {
  field: string;
  direction: "asc" | "desc";
}

export interface QueryDescriptor {
  collection: string;
  filters: FilterCondition[];
  sort?: SortCondition;
  searchTerm?: string;
  pageSize: number;
  /** Offset-based pagination is prohibited — only cursor-based is allowed. */
  offset?: never;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Known composite indexes for Golden Acres CRM. */
const KNOWN_COMPOSITE_INDEXES: Array<{ fields: string[] }> = [
  { fields: ["projectId", "status"] },
  { fields: ["projectId", "assignedTo"] },
  { fields: ["projectId", "createdAt"] },
  { fields: ["projectId", "status", "assignedTo"] },
  { fields: ["projectId", "followUpDate"] },
];

export function validateQuery(query: QueryDescriptor): ValidationResult {
  const errors: string[] = [];

  // Minimum search length
  if (
    query.searchTerm !== undefined &&
    query.searchTerm.trim().length > 0 &&
    query.searchTerm.trim().length < DESKTOP_BUDGETS.minSearchLength
  ) {
    errors.push(
      `Search term must be at least ${DESKTOP_BUDGETS.minSearchLength} characters.`
    );
  }

  // Page size guard
  if (query.pageSize > DESKTOP_BUDGETS.maxPageSize) {
    errors.push(
      `Page size ${query.pageSize} exceeds maximum of ${DESKTOP_BUDGETS.maxPageSize}.`
    );
  }

  // Offset pagination is prohibited at the type level; runtime guard for safety
  if ("offset" in (query as unknown as Record<string, unknown>) && (query as unknown as Record<string, unknown>)["offset"] !== undefined) {
    errors.push("Offset-based pagination is prohibited. Use cursor-based pagination.");
  }

  // Unbounded collection read guard
  if (query.filters.length === 0 && !query.searchTerm) {
    errors.push(
      "Unbounded collection reads are prohibited. Provide at least one filter."
    );
  }

  // Sort requires a preceding equality filter on the same field (Firestore rule)
  if (query.sort) {
    const equalityFilters = query.filters.filter((f) => f.operator === "==").map((f) => f.field);
    if (query.filters.length > 0 && !equalityFilters.includes(query.sort.field)) {
      // Check index coverage
      const filterFields = query.filters.map((f) => f.field);
      const allFields = [...filterFields, query.sort.field];
      const covered = KNOWN_COMPOSITE_INDEXES.some((idx) =>
        allFields.every((f) => idx.fields.includes(f))
      );
      if (!covered) {
        errors.push(
          `Sort on "${query.sort.field}" with active filters may require a composite index: [${allFields.join(", ")}].`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
