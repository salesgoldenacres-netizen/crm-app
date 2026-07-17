/**
 * PaginationService (Wave 8 Phase 2D)
 * Cursor-based pagination with opaque CursorToken (base64 serialized).
 * Firestore DocumentSnapshot never escapes this module.
 * Max page size: 50 (hard cap).
 */

import { DocumentSnapshot } from "firebase/firestore";

// ─── Opaque Token ────────────────────────────────────────────────────────────

/** Opaque serialized cursor — feature code never accesses internals. */
export type CursorToken = string & { readonly __cursorBrand: unique symbol };

interface CursorPayload {
  docId: string;
  collectionPath: string;
  timestamp: number;
}

function serializeCursor(snapshot: DocumentSnapshot): CursorToken {
  const payload: CursorPayload = {
    docId: snapshot.id,
    collectionPath: snapshot.ref.path,
    timestamp: Date.now(),
  };
  return btoa(JSON.stringify(payload)) as CursorToken;
}

function deserializeCursor(token: CursorToken): CursorPayload | null {
  try {
    return JSON.parse(atob(token)) as CursorPayload;
  } catch {
    return null;
  }
}

// ─── Constraints ─────────────────────────────────────────────────────────────

export const MAX_PAGE_SIZE = 50;

export class PaginationError extends Error {
  constructor(message: string) {
    super(`[PaginationService] ${message}`);
    this.name = "PaginationError";
  }
}

// ─── Page Contract ────────────────────────────────────────────────────────────

export interface CursorPage<T> {
  items: T[];
  nextCursor?: CursorToken;
  previousCursor?: CursorToken;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageSize: number;
  totalFetched: number;
}

// ─── Cursor Stack (previous page navigation) ─────────────────────────────────

export class CursorStack {
  private stack: CursorToken[] = [];

  push(cursor: CursorToken): void {
    this.stack.push(cursor);
  }

  pop(): CursorToken | undefined {
    return this.stack.pop();
  }

  peek(): CursorToken | undefined {
    return this.stack[this.stack.length - 1];
  }

  clear(): void {
    this.stack = [];
  }

  get depth(): number {
    return this.stack.length;
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Build a CursorPage from raw Firestore query results.
 * Never accepts page sizes over MAX_PAGE_SIZE.
 * Never exposes DocumentSnapshot objects.
 */
export function buildCursorPage<T>(
  snapshots: DocumentSnapshot[],
  mapper: (snap: DocumentSnapshot) => T,
  pageSize: number,
  cursorStack: CursorStack,
  requestedCursor?: CursorToken
): CursorPage<T> {
  if (pageSize > MAX_PAGE_SIZE) {
    throw new PaginationError(
      `Page size ${pageSize} exceeds maximum allowed (${MAX_PAGE_SIZE}).`
    );
  }
  if (pageSize < 1) {
    throw new PaginationError(`Page size must be at least 1.`);
  }

  // We fetch pageSize + 1 to detect if a next page exists.
  const hasNextPage = snapshots.length > pageSize;
  const pageSnapshots = hasNextPage ? snapshots.slice(0, pageSize) : snapshots;
  const items = pageSnapshots.map(mapper);

  // Serialize the last document as the next cursor.
  const lastSnap = pageSnapshots[pageSnapshots.length - 1];
  const nextCursor: CursorToken | undefined = hasNextPage && lastSnap
    ? serializeCursor(lastSnap)
    : undefined;

  // Track previous cursor using the stack.
  const hasPreviousPage = cursorStack.depth > 0;
  const previousCursor = cursorStack.peek();

  // Push the current cursor position (before this page) onto the stack.
  if (requestedCursor) {
    cursorStack.push(requestedCursor);
  }

  return {
    items,
    nextCursor,
    previousCursor,
    hasNextPage,
    hasPreviousPage,
    pageSize,
    totalFetched: pageSnapshots.length,
  };
}

/**
 * Inspect a CursorToken to extract the document ID (for Firestore startAfter).
 * This is the ONLY place in the codebase that reads cursor internals.
 * Feature code must never call this.
 */
export function getCursorDocId(token: CursorToken): string | null {
  const payload = deserializeCursor(token);
  return payload?.docId ?? null;
}

/**
 * Validate a page size, throwing a typed error if invalid.
 */
export function validatePageSize(pageSize: number): void {
  if (pageSize > MAX_PAGE_SIZE) {
    throw new PaginationError(
      `Requested page size ${pageSize} exceeds the maximum allowed size of ${MAX_PAGE_SIZE}.`
    );
  }
  if (pageSize < 1) {
    throw new PaginationError(`Page size must be at least 1, got ${pageSize}.`);
  }
}
