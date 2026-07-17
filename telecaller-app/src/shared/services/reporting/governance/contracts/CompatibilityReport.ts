// src/shared/services/reporting/governance/contracts/CompatibilityReport.ts
import { DefinitionVersion } from "./DefinitionVersion";

export interface CompatibilityReport {
  readonly isCompatible: boolean;
  readonly compatibilityLevel: "full" | "partial" | "incompatible";
  readonly evaluatedEngineVersion: DefinitionVersion;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly requiredMigrations: readonly string[];
}
