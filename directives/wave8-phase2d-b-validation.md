# Wave 8 Phase 2D-B Validation

Pagination behaviors and limits can be verified using the following rules:

- **Limit Restrictions**: Requesting a page size of > 50 throws `PageSizeExceededError`.
- **Offset Prohibitions**: Passing an `offset` value to scoped query builders triggers an immediate query error.
- **Opaqueness**: `CursorToken` branded parameters cannot be manually mapped or modified by feature layout systems.
- **Stack Tracking**: Previous navigation stack tracking is managed client-side in `PaginationService`.
