/**
 * LeadCache (Wave 8 Phase 2D)
 * LRU page cache with project-aware segmentation and full metrics API.
 * Owns its own TTL (60s). Does not share state with Analytics or Firestore caches.
 *
 * Provider contract: exposes health() / stats() / clear() / dispose().
 */

import { CursorToken } from "./paginationService";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeadCacheStats {
  hits: number;
  misses: number;
  evictions: number;
  occupancy: number;        // Number of entries currently cached
  capacity: number;         // Max entries before LRU eviction
  oldestEntry: number | null;  // Timestamp of oldest cached entry
  memoryEstimate: number;   // Rough bytes estimate
}

export interface LeadCacheHealth {
  status: "healthy" | "degraded";
  hitRatio: number;
  message?: string;
}

interface CacheEntry<T> {
  data: T;
  createdAt: number;
  lastAccessedAt: number;
  sizeEstimate: number;
}

// ─── Cache Key ───────────────────────────────────────────────────────────────

function buildKey(projectId: string, cursor: CursorToken | "first"): string {
  return `${projectId}::${cursor}`;
}

// ─── LRU Implementation ──────────────────────────────────────────────────────

const DEFAULT_CAPACITY = 20;   // pages
const DEFAULT_TTL_MS = 60_000; // 60 seconds

export class LeadCache<T = unknown> {
  private readonly capacity: number;
  private readonly ttlMs: number;
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly keyOrder: string[] = []; // front = oldest, back = most recent

  private _hits = 0;
  private _misses = 0;
  private _evictions = 0;

  constructor(options?: { capacity?: number; ttlMs?: number }) {
    this.capacity = options?.capacity ?? DEFAULT_CAPACITY;
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  }

  // ─── Core API ─────────────────────────────────────────────────────────────

  get(projectId: string, cursor: CursorToken | "first"): T | null {
    const key = buildKey(projectId, cursor);
    const entry = this.store.get(key);

    if (!entry) {
      this._misses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.createdAt > this.ttlMs) {
      this.evict(key);
      this._misses++;
      return null;
    }

    entry.lastAccessedAt = now;
    this.promote(key);
    this._hits++;
    return entry.data;
  }

  put(projectId: string, cursor: CursorToken | "first", data: T): void {
    const key = buildKey(projectId, cursor);

    if (this.store.has(key)) {
      this.evict(key);
    }

    if (this.store.size >= this.capacity) {
      this.evictLRU();
    }

    const sizeEstimate = this.estimateSize(data);
    this.store.set(key, {
      data,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      sizeEstimate,
    });
    this.keyOrder.push(key);
  }

  // ─── Project-Scoped Clear ─────────────────────────────────────────────────

  clearProject(projectId: string): void {
    const prefix = `${projectId}::`;
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(prefix)) {
        this.evict(key);
      }
    }
  }

  // ─── Provider Contract ────────────────────────────────────────────────────

  clear(): void {
    this.store.clear();
    this.keyOrder.length = 0;
    this._evictions += this.store.size;
  }

  dispose(): void {
    this.clear();
  }

  stats(): LeadCacheStats {
    const entries = [...this.store.values()];
    const oldest = entries.reduce<number | null>((min, e) => {
      return min === null ? e.createdAt : Math.min(min, e.createdAt);
    }, null);
    const memoryEstimate = entries.reduce((sum, e) => sum + e.sizeEstimate, 0);

    return {
      hits: this._hits,
      misses: this._misses,
      evictions: this._evictions,
      occupancy: this.store.size,
      capacity: this.capacity,
      oldestEntry: oldest,
      memoryEstimate,
    };
  }

  health(): LeadCacheHealth {
    const total = this._hits + this._misses;
    const hitRatio = total === 0 ? 1 : this._hits / total;
    return {
      status: hitRatio < 0.3 && total > 10 ? "degraded" : "healthy",
      hitRatio,
      message:
        hitRatio < 0.3 && total > 10
          ? `Low cache hit ratio: ${(hitRatio * 100).toFixed(0)}%`
          : undefined,
    };
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  private evict(key: string): void {
    this.store.delete(key);
    const idx = this.keyOrder.indexOf(key);
    if (idx > -1) this.keyOrder.splice(idx, 1);
    this._evictions++;
  }

  private evictLRU(): void {
    // keyOrder[0] is the oldest (least recently used)
    const oldest = this.keyOrder[0];
    if (oldest) this.evict(oldest);
  }

  private promote(key: string): void {
    const idx = this.keyOrder.indexOf(key);
    if (idx > -1) {
      this.keyOrder.splice(idx, 1);
      this.keyOrder.push(key);
    }
  }

  private estimateSize(data: T): number {
    try {
      return JSON.stringify(data).length * 2; // UTF-16 rough estimate
    } catch {
      return 0;
    }
  }
}

// ─── Singleton factory (one cache per project session) ───────────────────────

let _instance: LeadCache | null = null;

export function getLeadCache<T = unknown>(): LeadCache<T> {
  if (!_instance) {
    _instance = new LeadCache();
  }
  return _instance as LeadCache<T>;
}

export function resetLeadCache(): void {
  _instance?.dispose();
  _instance = null;
}
