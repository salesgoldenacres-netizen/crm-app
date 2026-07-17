// src/shared/services/performance/cache/contracts/CacheEntry.ts
import { CursorPage } from "../../pagination/contracts/CursorPage";

export interface CacheEntry<T> {
  readonly key: string;
  readonly page: CursorPage<T>;
  readonly createdAt: number;
  readonly lastAccessed: number;
  readonly sequence: number;
}
