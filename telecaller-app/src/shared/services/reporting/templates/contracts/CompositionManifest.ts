// src/shared/services/reporting/templates/contracts/CompositionManifest.ts
export interface CompositionManifest {
  readonly templateId: string;
  readonly templateVersion: string;
  readonly composerVersion: string;
  readonly executionId: string;
  readonly correlationId: string;
  readonly templateHash: string;
  readonly configurationHash: string;
  readonly builderGraphHash: string;
  readonly generatedBy: string;
  readonly generatedAt: string;
  readonly durationMs: number;
  readonly builderCount: number;
  readonly parallelGroupCount: number;
  readonly parallelExecutionTime: number;
  readonly validationTime: number;
  readonly serializationTime: number;
  readonly sectionCount: number;
  readonly warnings: readonly string[];
}
