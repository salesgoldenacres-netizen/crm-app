# Wave 8 Phase 2D-C Validation

Caching behaviors and limits can be verified using the following rules:

- **Lazy TTL**: expired entries are removed on lookup, leaving memory lightweight.
- **LRU Tie-breaking**: sequence counters resolve identical millisecond creation stamps, ensuring deterministic eviction.
- **Cache Hits / Misses**: telemetries and execution bypasses are monitored using `getStatistics()`.
- **Project Switch**: `clearProject(projectId)` removes only the specified project segment.
