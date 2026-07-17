# Performance Monitoring (Wave 8 Phase 2D-D)

`PerformanceMonitor` acts as a framework-independent event collector:

- Centralizes events under a single `record()` handler using discriminated union type contracts (`PerformanceEvent`).
- Exposes rolling averages for latency thresholds and calculations without coupling to React or styling nodes.
- Preserves legacy backward compatibility hooks for the validation test suite.
