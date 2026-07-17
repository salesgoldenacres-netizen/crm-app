# Analytics Caching Policy

Centralized caching policy rules and invalidation strategies for Golden Acres enterprise scale.

## Cache Classes & TTLs

1. **Realtime Metrics** (`dashboard`, `activity`)
   - **TTL**: 15 seconds
   - **Use Case**: Daily call count progress, user specific operational dials.
2. **Count Aggregations** (`pipeline`, `booking`)
   - **TTL**: 30 seconds
   - **Use Case**: Overall stage funnel counts, total project status distributions.
3. **Summary Documents** (`team`)
   - **TTL**: 5 minutes (300 seconds)
   - **Use Case**: Complex monthly conversions, team performance trends.

## Invalidation Triggers

Caches are cleared completely under the following conditions:
- **Sign Out**: Current session terminates.
- **Project Switching**: Active project scope changes.
- **Permission Changes**: User role or group is re-evaluated.
- **Manual Refresh**: Explicit reload requested.
