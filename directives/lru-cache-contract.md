# LRU Cache Contract (Wave 8 Phase 2D-C)

`LeadPageCache` guarantees:
- **Project Segmentation**: Project maps remain strictly isolated. Purging one does not leak into or affect another.
- **Sub-millisecond LRU Ties**: Implements a monotonic sequence counter to guarantee deterministic eviction of the least recently accessed entry on capacity overflow.
- **Lazy TTL**: expired entries are discarded on `get()`, avoiding polling timers, threads, or resource-heavy intervals.
