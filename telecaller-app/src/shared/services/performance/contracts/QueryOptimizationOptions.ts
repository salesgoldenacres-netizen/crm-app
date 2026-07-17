// src/shared/services/performance/contracts/QueryOptimizationOptions.ts
export interface QueryOptimizationOptions {
  readonly filters: readonly unknown[];
  readonly sort?: string;
  readonly pageSize: number;
  readonly search?: string;
}
