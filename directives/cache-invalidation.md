# Cache Invalidation (Wave 8 Phase 2D-C)

`LeadPageCache` defines explicit boundaries to invalidate stored data:

- **Project Switching**: Changing projects triggers `clearProject(projectId)`, evacuating all pages associated with the previous segment.
- **User Logout**: Clearing user sessions triggers `clearAll()`, resetting hits, misses, evictions, and purging all mapped project buckets.
- **Lazy TTL Eviction**: Expired records are deleted dynamically upon lookup.
