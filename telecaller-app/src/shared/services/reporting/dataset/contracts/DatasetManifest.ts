// src/shared/services/reporting/dataset/contracts/DatasetManifest.ts
export interface DatasetManifest {
  readonly executionId: string;
  readonly correlationId: string;
  readonly plannerVersion: string;
  readonly builderGraphHash: string;
  readonly generationTimestamp: string;
  readonly durationMs: number;
  readonly providerCount: number;
  readonly parallelGroupCount: number;
  readonly parallelExecutionTime: number;
  readonly validationTime: number;
  readonly warnings: readonly string[];
}
