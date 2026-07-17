# Pagination Contract (Wave 8 Phase 2D)

## Cursor Token

`CursorToken` is an opaque branded string (`string & { __cursorBrand }`).

It is base64 encoded and contains serialized position data. Firestore `DocumentSnapshot` objects **never leave** `paginationService.ts`.

### Rules
- **Feature code** must never decode, inspect, or manipulate `CursorToken`.
- **Components** receive `CursorToken` from the `CursorPage<T>` interface and pass it back to the service.
- Only `paginationService.ts` calls `serializeCursor()` and `getCursorDocId()`.

## CursorPage Interface

```typescript
interface CursorPage<T> {
  items: T[];
  nextCursor?: CursorToken;
  previousCursor?: CursorToken;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageSize: number;
  totalFetched: number;
}
```

## Page Size Limits

| Constraint | Value |
|---|---|
| Hard maximum | 50 rows |
| Minimum | 1 row |
| Violation behavior | Throws `PaginationError` |

Offset-based pagination is prohibited at both the type level (`offset?: never`) and runtime.

## CursorStack

Use `CursorStack` to track previous cursor positions for back-navigation:

```typescript
const stack = new CursorStack();

// On forward navigation:
if (requestedCursor) stack.push(requestedCursor);

// On back navigation:
const previousCursor = stack.pop();
```

## Back-Navigation Pattern

```
First page  → cursor: undefined  → store: []
Page 2      → cursor: token1     → store: [token1]
Page 3      → cursor: token2     → store: [token1, token2]
← Back      → pop() → token2    → store: [token1]
← Back      → pop() → token1    → store: []
← Back      → empty stack → first page
```
