// src/shared/services/performance/cache/LeadPageCache.ts
import { PageCache } from "./contracts/PageCache";
import { CacheEntry } from "./contracts/CacheEntry";
import { CacheStatistics } from "./contracts/CacheStatistics";
import { DEFAULT_CACHE_TTL, DEFAULT_CACHE_SIZE } from "./contracts/CacheConfiguration";
import { CursorPage } from "../pagination/contracts/CursorPage";
import { Lead } from "@/shared/types";

export class LeadPageCache implements PageCache<Lead> {
  // project-aware structure: projectId -> Map of cache keys to entries
  private cache = new Map<string, Map<string, CacheEntry<Lead>>>();
  
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  private sequenceCounter = 0;

  constructor(
    private readonly ttlMs = DEFAULT_CACHE_TTL,
    private readonly maxPages = DEFAULT_CACHE_SIZE
  ) {}

  /**
   * Retrieves page from the cache if not expired (Lazy TTL evaluation).
   */
  get(projectId: string, key: string): CursorPage<Lead> | undefined {
    const projectCache = this.cache.get(projectId);
    if (!projectCache) {
      this.misses++;
      return undefined;
    }

    const entry = projectCache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    const now = Date.now();
    // Lazy TTL check
    if (now - entry.createdAt > this.ttlMs) {
      projectCache.delete(key);
      this.misses++;
      return undefined;
    }

    // Update access metadata to support LRU eviction order
    const updatedEntry: CacheEntry<Lead> = {
      ...entry,
      lastAccessed: now,
      sequence: ++this.sequenceCounter,
    };
    projectCache.set(key, updatedEntry);

    this.hits++;
    return entry.page;
  }

  /**
   * Caches the immutable page. Triggers deterministic LRU evictions on limit.
   */
  set(projectId: string, key: string, page: CursorPage<Lead>): void {
    let projectCache = this.cache.get(projectId);
    if (!projectCache) {
      projectCache = new Map<string, CacheEntry<Lead>>();
      this.cache.set(projectId, projectCache);
    }

    // Enforce LRU eviction if size limit is exceeded
    if (projectCache.size >= this.maxPages) {
      let oldestKey: string | null = null;
      let oldestSequence = Infinity;

      for (const [k, entry] of projectCache.entries()) {
        if (entry.sequence < oldestSequence) {
          oldestSequence = entry.sequence;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        projectCache.delete(oldestKey);
        this.evictions++;
      }
    }

    const now = Date.now();
    const entry: CacheEntry<Lead> = {
      key,
      page,
      createdAt: now,
      lastAccessed: now,
      sequence: ++this.sequenceCounter,
    };

    projectCache.set(key, entry);
  }

  delete(projectId: string, key: string): void {
    const projectCache = this.cache.get(projectId);
    if (projectCache) {
      projectCache.delete(key);
    }
  }

  clearProject(projectId: string): void {
    this.cache.delete(projectId);
  }

  clearAll(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  getStatistics(): CacheStatistics {
    let totalEntries = 0;
    for (const projectCache of this.cache.values()) {
      totalEntries += projectCache.size;
    }

    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      entries: totalEntries,
    };
  }
}
export const leadPageCache = new LeadPageCache();
