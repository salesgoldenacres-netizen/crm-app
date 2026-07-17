// src/shared/services/reporting/governance/contracts/DefinitionIdentity.ts
export interface DefinitionIdentity {
  readonly id: string;
  readonly type: "template" | "dataset-provider" | "section-builder" | "plugin";
  readonly namespace: string;
}
