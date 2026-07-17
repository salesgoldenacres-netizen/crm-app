import { describe, it, expect, beforeEach, vi } from "vitest";
import { LeadPageCache } from "./LeadPageCache";
import { PaginationService } from "../pagination/PaginationService";
import { CursorToken } from "../pagination/contracts/CursorToken";
import { Lead } from "@/shared/types";

describe("Wave 8 Phase 2D-C Lead Page Cache", () => {
  let cache: LeadPageCache;

  beforeEach(() => {
    // 3 items max, 1000ms TTL
    cache = new LeadPageCache(1000, 3);
  });

  describe("Cache CRUD & Operations", () => {
    const dummyPage = PaginationService.buildCursorPage<Lead>([], 25, undefined, undefined, false, false);

    it("stores and retrieves a page correctly", () => {
      cache.set("proj1", "key1", dummyPage);
      expect(cache.get("proj1", "key1")).toEqual(dummyPage);
    });

    it("returns undefined for cache misses", () => {
      expect(cache.get("proj1", "missing")).toBeUndefined();
    });

    it("supports deleting individual entries", () => {
      cache.set("proj1", "key1", dummyPage);
      cache.delete("proj1", "key1");
      expect(cache.get("proj1", "key1")).toBeUndefined();
    });

    it("clears everything on clearAll", () => {
      cache.set("proj1", "key1", dummyPage);
      cache.clearAll();
      expect(cache.get("proj1", "key1")).toBeUndefined();
      expect(cache.getStatistics().hits).toBe(0);
    });
  });

  describe("Lazy TTL Expiration", () => {
    const dummyPage = PaginationService.buildCursorPage<Lead>([], 25, undefined, undefined, false, false);

    it("retains valid entries before TTL limit", () => {
      cache.set("proj1", "key1", dummyPage);
      expect(cache.get("proj1", "key1")).toEqual(dummyPage);
    });

    it("lazily removes expired entries on access", () => {
      vi.useFakeTimers();
      cache.set("proj1", "key1", dummyPage);

      // Fast-forward past TTL (1000ms)
      vi.advanceTimersByTime(1100);

      expect(cache.get("proj1", "key1")).toBeUndefined();
      vi.useRealTimers();
    });
  });

  describe("Deterministic LRU Eviction", () => {
    const dummyPage = PaginationService.buildCursorPage<Lead>([], 25, undefined, undefined, false, false);

    it("evicts the least recently accessed item when capacity exceeded", () => {
      cache.set("proj1", "key1", dummyPage);
      cache.set("proj1", "key2", dummyPage);
      cache.set("proj1", "key3", dummyPage);

      // Access key1 to make key2 the oldest accessed
      cache.get("proj1", "key1");

      // Push a fourth entry
      cache.set("proj1", "key4", dummyPage);

      expect(cache.get("proj1", "key2")).toBeUndefined(); // Evicted
      expect(cache.get("proj1", "key1")).toBeDefined();
      expect(cache.get("proj1", "key3")).toBeDefined();
      expect(cache.get("proj1", "key4")).toBeDefined();
      expect(cache.getStatistics().evictions).toBe(1);
    });
  });

  describe("Project Segmentation", () => {
    const dummyPage = PaginationService.buildCursorPage<Lead>([], 25, undefined, undefined, false, false);

    it("isolates cache scopes by project ID", () => {
      cache.set("proj1", "key1", dummyPage);
      cache.set("proj2", "key1", dummyPage);

      cache.clearProject("proj1");

      expect(cache.get("proj1", "key1")).toBeUndefined();
      expect(cache.get("proj2", "key1")).toEqual(dummyPage);
    });
  });

  describe("Cache Key Generation (PaginationService)", () => {
    it("generates deterministic keys for identical requests", () => {
      const k1 = PaginationService.generateCacheKey("proj1", 25, "cursor1" as CursorToken, [{ field: "status" }], "updatedAt");
      const k2 = PaginationService.generateCacheKey("proj1", 25, "cursor1" as CursorToken, [{ field: "status" }], "updatedAt");
      expect(k1).toBe(k2);
    });
  });
});
