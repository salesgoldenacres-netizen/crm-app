// src/shared/services/performance/pagination/contracts/PaginationErrors.ts
export class PaginationError extends Error {
  constructor(message: string) {
    super(`[PaginationError] ${message}`);
    this.name = "PaginationError";
  }
}

export class InvalidCursorError extends PaginationError {
  constructor(message = "Invalid or malformed cursor token.") {
    super(message);
    this.name = "InvalidCursorError";
  }
}

export class PageSizeExceededError extends PaginationError {
  constructor(size: number, limit: number) {
    super(`Requested page size ${size} exceeds the maximum limit of ${limit}.`);
    this.name = "PageSizeExceededError";
  }
}

export class OffsetPaginationNotSupportedError extends PaginationError {
  constructor() {
    super("Offset-based pagination is explicitly prohibited.");
    this.name = "OffsetPaginationNotSupportedError";
  }
}
