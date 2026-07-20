// src/shared/services/performance/pagination/contracts/PaginationProvider.ts
import { CursorPage } from "./CursorPage";
import { CursorToken } from "./CursorToken";
import type { LeadPageScope } from "./LeadPageScope";

export interface PaginationOptions {
  readonly pageSize: number;
  readonly cursor?: CursorToken;
  /** Lead-list scope consumed by FirestorePaginationProvider (ignored by other providers). */
  readonly leadScope?: LeadPageScope;
}

export interface PaginationProvider<T> {
  /**
   * Fetch a stateless page of items.
   * Navigation state and stacks are managed in PaginationService.
   */
  fetchPage(options: PaginationOptions): Promise<CursorPage<T>>;
}
