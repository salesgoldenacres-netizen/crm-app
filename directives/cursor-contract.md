# Cursor Contract (Wave 8 Phase 2D-B)

`CursorToken` is a branded, opaque value representing pagination position limits:

```typescript
export type CursorToken = string & {
  readonly __brand: "CursorToken";
};
```

## Isolation Principles

- Callers must never cast values directly to `CursorToken` using `as CursorToken`.
- Internal structure and serialization are private and encapsulated. Only `FirestoreCursorAdapter` creates (`encode`) and parses (`decode`) them.
- This allows changing the serialization encoding format (e.g. from base64 JSON to hashed payloads) later without impacting callers.
