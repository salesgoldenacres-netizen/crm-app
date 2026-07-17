// src/shared/services/reporting/dataset/DatasetExecutionPlanner.ts
import { DatasetKey } from "./contracts/DatasetKey";
import { DatasetFragment } from "./contracts/DatasetFragment";
import { DatasetExecutionPlan } from "./contracts/DatasetExecutionPlan";
import { DatasetProviderResolver } from "./DatasetProviderResolver";
import { DatasetValidationError } from "./DatasetErrors";

export class DatasetExecutionPlanner {
  constructor(private readonly resolver: DatasetProviderResolver) {}

  public plan(keys: readonly DatasetKey<DatasetFragment>[]): DatasetExecutionPlan {
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const idToKey = new Map<string, DatasetKey<DatasetFragment>>();

    for (const key of keys) {
      idToKey.set(key.id, key);
      inDegree.set(key.id, 0);
    }

    const dependencyGraph: Record<string, string[]> = {};

    for (const key of keys) {
      try {
        const provider = this.resolver.resolve(key);
        const deps = provider.metadata.dependsOn || [];
        dependencyGraph[key.id] = deps.map((d) => d.id);

        for (const dep of deps) {
          if (idToKey.has(dep.id)) {
            const list = adj.get(dep.id) || [];
            list.push(key.id);
            adj.set(dep.id, list);
            inDegree.set(key.id, (inDegree.get(key.id) || 0) + 1);
          }
        }
      } catch {
        // Validation handles this
      }
    }

    let queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    const parallelGroups: DatasetKey<DatasetFragment>[][] = [];
    const executionOrder: string[] = [];

    while (queue.length > 0) {
      const nextQueue: string[] = [];
      const currentGroup: DatasetKey<DatasetFragment>[] = [];

      for (const id of queue) {
        const key = idToKey.get(id);
        if (key) {
          currentGroup.push(key);
          executionOrder.push(id);
        }

        const neighbors = adj.get(id) || [];
        for (const neighbor of neighbors) {
          const deg = (inDegree.get(neighbor) || 1) - 1;
          inDegree.set(neighbor, deg);
          if (deg === 0) {
            nextQueue.push(neighbor);
          }
        }
      }

      if (currentGroup.length > 0) {
        parallelGroups.push(Object.freeze(currentGroup));
      }
      queue = nextQueue;
    }

    if (executionOrder.length < keys.length) {
      throw new DatasetValidationError("[DatasetExecutionPlanner] Circular dependency detected in providers graph.");
    }

    const graphHash = `graph_${executionOrder.join("_")}`;

    const plan: DatasetExecutionPlan = {
      parallelGroups: Object.freeze(parallelGroups.map((g) => Object.freeze(g))),
      executionOrder: Object.freeze(executionOrder),
      graphHash,
      dependencyGraph: Object.freeze(dependencyGraph),
    };

    return Object.freeze(plan);
  }
}
