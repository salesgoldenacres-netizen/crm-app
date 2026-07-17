// src/shared/services/reporting/dataset/DatasetExecutionScheduler.ts
import { DatasetExecutionPlan } from "./contracts/DatasetExecutionPlan";
import { Report } from "../../contracts/Report";
import { DatasetContext } from "./contracts/DatasetContext";
import { DatasetFragment } from "./contracts/DatasetFragment";
import { DatasetProviderResolver } from "./DatasetProviderResolver";

export class DatasetExecutionScheduler {
  constructor(private readonly resolver: DatasetProviderResolver) {}

  public async schedule(
    plan: DatasetExecutionPlan,
    report: Report<unknown>,
    context: DatasetContext
  ): Promise<{ results: Map<string, DatasetFragment>; warnings: string[]; parallelExecutionTime: number }> {
    const warnings: string[] = [];
    const results = new Map<string, DatasetFragment>();
    const executionStart = performance.now();

    for (const group of plan.parallelGroups) {
      if (context.cancellationToken?.isCancelled) {
        throw new Error("[DatasetExecutionScheduler] Dataset generation was cancelled.");
      }

      const groupResults = await Promise.all(
        group.map(async (key) => {
          if (context.cancellationToken?.isCancelled) {
            throw new Error("[DatasetExecutionScheduler] Dataset generation was cancelled.");
          }

          const provider = this.resolver.resolve(key);
          try {
            const fragment = await provider.provide({ report, context });
            
            if (!Object.isFrozen(fragment)) {
              Object.freeze(fragment);
            }
            
            return { key: key.id, fragment };
          } catch (err: any) {
            throw new CalculationError(
              `[DatasetExecutionScheduler] Provider execution failed for key ${key.id}: ${err.message}`,
              { cause: err }
            );
          }
        })
      );

      for (const res of groupResults) {
        results.set(res.key, res.fragment);
      }
    }

    const parallelExecutionTime = performance.now() - executionStart;
    return {
      results,
      warnings,
      parallelExecutionTime,
    };
  }
}
