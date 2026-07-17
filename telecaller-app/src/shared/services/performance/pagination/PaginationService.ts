// src/shared/services/performance/pagination/PaginationService.ts
import { CursorPage } from "./contracts/CursorPage";
import { CursorToken } from "./contracts/CursorToken";
import { MAX_PAGE_SIZE, MIN_PAGE_SIZE } from "./contracts/paginationConstants";
import { PageSizeExceededError, PaginationError } from "./contracts/PaginationErrors";

export class PaginationService {
  private previousCursors: CursorToken[] = [];

  constructor() {}

  /**
   * Validates requested page size bounds.
   */
  public static validatePageSize(pageSize: number): void {
    if (pageSize > MAX_PAGE_SIZE) {
      throw new PageSizeExceededError(pageSize, MAX_PAGE_SIZE);
    }
    if (pageSize < MIN_PAGE_SIZE) {
      throw new PaginationError(`Page size must be at least ${MIN_PAGE_SIZE}.`);
    }
  }

  /**
   * Tracks stack navigation for backward traversal.
   * State is isolated entirely in this client-side service.
   */
  public registerPageNavigation(
    _nextCursor?: CursorToken,
    requestedCursor?: CursorToken
  ): void {
    if (requestedCursor) {
      // If we are navigating to a new page, push the previous cursor onto the stack
      this.previousCursors.push(requestedCursor);
    } else {
      // Navigating back to the first page
      this.previousCursors = [];
    }
  }

  public getPreviousCursor(): CursorToken | undefined {
    return this.previousCursors[this.previousCursors.length - 1];
  }

  public popPreviousCursor(): CursorToken | undefined {
    const popped = this.previousCursors.pop();
    return popped;
  }

  public resetNavigation(): void {
    this.previousCursors = [];
  }

  /**
   * Generates a deterministic cache key for query uniqueness.
   */
  public static generateCacheKey(
    projectId: string,
    pageSize: number,
    cursor?: CursorToken,
    filters: unknown[] = [],
    sort?: string
  ): string {
    const parts = [
      projectId,
      String(pageSize),
      cursor ? String(cursor) : "first",
      JSON.stringify(filters),
      sort ?? "default"
    ];
    return parts.join("::");
  }

  /**
   * Creates an immutable read-only CursorPage representation.
   */
  public static buildCursorPage<T>(
    items: readonly T[],
    pageSize: number,
    nextCursor?: CursorToken,
    previousCursor?: CursorToken,
    hasNextPage = false,
    hasPreviousPage = false
  ): CursorPage<T> {
    return Object.freeze({
      items: Object.freeze([...items]),
      nextCursor,
      previousCursor,
      hasNextPage,
      hasPreviousPage,
      pageSize,
    });
  }
}
