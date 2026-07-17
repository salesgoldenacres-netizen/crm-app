// src/shared/services/performance/pagination/contracts/PaginationProvider.ts
import { CursorPage } from "./CursorPage";
import { CursorToken } from "./CursorToken";

export interface PaginationOptions {
  readonly pageSize: number;
  readonly cursor?: CursorToken;
}

export interface PaginationProvider<T> {
  /**
   * Fetch a stateless page of items.
   * Navigation state and stacks are managed in PaginationService.
   */
  fetchPage(options: PaginationOptions): Promise<CursorPage<T>>;
}
