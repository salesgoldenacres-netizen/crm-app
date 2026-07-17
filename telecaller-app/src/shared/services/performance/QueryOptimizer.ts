// src/shared/services/performance/QueryOptimizer.ts
import { QueryAnalysis } from "./contracts/QueryAnalysis";
import { QueryOptimizationOptions } from "./contracts/QueryOptimizationOptions";

export class QueryOptimizer {
  /**
   * Centralized query shape analysis service.
   * Pure TypeScript module: Zero React or Firestore dependencies.
   */
  public static analyze(options: QueryOptimizationOptions): QueryAnalysis {
    const warnings: string[] = [];
    const requiredIndexes: string[] = [];
    let valid = true;
    let estimatedReadCost: "low" | "medium" | "high" = "low";

    // 1. Page size evaluation
    if (options.pageSize > 50) {
      valid = false;
      warnings.push(`Page size ${options.pageSize} exceeds maximum permitted limit of 50.`);
      estimatedReadCost = "high";
    } else if (options.pageSize > 25) {
      estimatedReadCost = "medium";
    }

    // 2. Search length check
    if (options.search && options.search.length < 3) {
      warnings.push(`Search query "${options.search}" is too short. Minimum recommended length is 3 characters.`);
    }

    // 3. Detect client-side sorting warnings
    if (options.sort && !options.sort.startsWith("projectId")) {
      warnings.push(`Sorting by "${options.sort}" may trigger in-memory sorting warnings unless indexed.`);
      requiredIndexes.push(options.sort);
    }

    // 4. Scrutinize filters for unsupported combinations or index needs
    if (options.filters.length > 0) {
      if (options.filters.length > 3) {
        estimatedReadCost = "high";
        warnings.push("High number of query filters detected; composite index matching is recommended.");
      }
      
      // Look for nested property keys to recommend indices
      options.filters.forEach((f: any) => {
        if (f && typeof f === "object") {
          const key = f.field || Object.keys(f)[0];
          if (key && typeof key === "string" && !requiredIndexes.includes(key)) {
            requiredIndexes.push(key);
          }
        }
      });
    }

    return {
      valid,
      warnings: Object.freeze(warnings),
      requiredIndexes: Object.freeze(requiredIndexes),
      estimatedReadCost,
    };
  }
}
