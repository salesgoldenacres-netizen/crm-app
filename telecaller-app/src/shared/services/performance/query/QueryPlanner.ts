/**
 * QueryPlanner (Wave 8 Phase 2D)
 * Responsibility: Construct a normalized, executable query plan from a descriptor.
 * Never validates, never rewrites filters. Takes a validated descriptor as input.
 */

import { QueryDescriptor, FilterCondition, SortCondition } from "./QueryValidator";
import { CursorToken } from "@/shared/services/performance/paginationService";

export interface QueryPlan {
  /** The original collection path. */
  collection: string;
  /** Normalized, ordered filters. */
  filters: FilterCondition[];
  /** Sort condition (if any). */
  sort?: SortCondition;
  /** Resolved page size (never exceeds 50 + 1 for hasNextPage detection). */
  fetchSize: number;
  /** Opaque cursor for startAfter — only pagination layer resolves this. */
  startAfterCursor?: CursorToken;
  /** Normalized search term (trimmed, lowercased). */
  searchTerm?: string;
}

/**
 * Build a QueryPlan from a validated QueryDescriptor.
 * The caller is responsible for validating the descriptor first (QueryValidator).
 */
export function planQuery(
  descriptor: QueryDescriptor,
  startAfterCursor?: CursorToken
): QueryPlan {
  const normalizedSearch = descriptor.searchTerm?.trim().toLowerCase();

  // Normalize filter order: equality filters first, then range filters.
  const equalityFilters = descriptor.filters.filter((f) =>
    ["==", "array-contains", "in"].includes(f.operator)
  );
  const rangeFilters = descriptor.filters.filter(
    (f) => !["==", "array-contains", "in"].includes(f.operator)
  );
  const normalizedFilters = [...equalityFilters, ...rangeFilters];

  return {
    collection: descriptor.collection,
    filters: normalizedFilters,
    sort: descriptor.sort,
    // Fetch pageSize + 1 to detect hasNextPage (sliced in PaginationService).
    fetchSize: descriptor.pageSize + 1,
    startAfterCursor,
    searchTerm: normalizedSearch || undefined,
  };
}
