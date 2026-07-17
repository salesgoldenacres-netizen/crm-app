// src/shared/services/performance/cache/contracts/PageCache.ts
import { CursorPage } from "../../pagination/contracts/CursorPage";
import { CacheStatistics } from "./CacheStatistics";

export interface PageCache<T> {
  get(projectId: string, key: string): CursorPage<T> | undefined;
  set(projectId: string, key: string, page: CursorPage<T>): void;
  delete(projectId: string, key: string): void;
  clearProject(projectId: string): void;
  clearAll(): void;
  getStatistics(): CacheStatistics;
}
