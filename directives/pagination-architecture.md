# Pagination Architecture (Wave 8 Phase 2D-B)

This document describes the decoupled pagination layer implemented in Wave 8 Phase 2D-B.

## Modular Isolation

To avoid leaking storage-specific variables or details to other systems:

- **PaginationService**: Operates as a pure client-side TypeScript module to handle pagination limits, validations, and stack tracking. Contains no Firestore references.
- **PaginationProvider**: Storage-agnostic repository interface. Exposes `fetchPage` resolving options into immutable `CursorPage<T>` details.
- **FirestorePaginationProvider**: Firestore concrete wrapper executing calls, checking project scoping constraints, and delegating cursor compilation.
- **FirestoreCursorAdapter**: Isolated translation boundary. Translates `DocumentSnapshot` items to and from branded, fully opaque `CursorToken` strings. Callers never access token payloads directly.

## State Isolation

`PaginationProvider` is completely stateless. Navigation history stack lists (backward page traversal) are managed strictly on the client inside `PaginationService`.
