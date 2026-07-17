// src/shared/services/performance/pagination/contracts/CursorPage.ts
import { CursorToken } from "./CursorToken";

export interface CursorPage<T> {
  readonly items: readonly T[];
  readonly nextCursor?: CursorToken;
  readonly previousCursor?: CursorToken;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly pageSize: number;
}
