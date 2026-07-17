// src/shared/services/performance/contracts/QueryAnalysis.ts
export interface QueryAnalysis {
  readonly valid: boolean;
  readonly warnings: readonly string[];
  readonly requiredIndexes: readonly string[];
  readonly estimatedReadCost: "low" | "medium" | "high";
}
