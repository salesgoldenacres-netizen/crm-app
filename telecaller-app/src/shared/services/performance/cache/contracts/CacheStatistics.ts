// src/shared/services/performance/cache/contracts/CacheStatistics.ts
export interface CacheStatistics {
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
  readonly entries: number;
}
