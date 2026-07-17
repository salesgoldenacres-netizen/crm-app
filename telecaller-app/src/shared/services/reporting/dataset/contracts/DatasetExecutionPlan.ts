// src/shared/services/reporting/dataset/contracts/DatasetExecutionPlan.ts
import { DatasetKey } from "./DatasetKey";
import { DatasetFragment } from "./DatasetFragment";

export interface DatasetExecutionPlan {
  readonly parallelGroups: readonly (readonly DatasetKey<DatasetFragment>[])[];
  readonly executionOrder: readonly string[];
  readonly graphHash: string;
  readonly dependencyGraph: Record<string, readonly string[]>;
}
