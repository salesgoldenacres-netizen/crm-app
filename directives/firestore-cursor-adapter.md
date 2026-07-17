# Firestore Cursor Adapter (Wave 8 Phase 2D-B)

`FirestoreCursorAdapter` handles all translation processes between `DocumentSnapshot` items and `CursorToken` strings.

- Serializes snapshot location metrics (id, collection ref path, version constraints) into base64 JSON payload.
- Verifies cursor token schema version limits (`CURSOR_VERSION = 1`) on deserialization.
- Completely prevents database-specific types from escaping pagination boundary structures.
