// src/shared/services/reporting/governance/contracts/MigrationResult.ts
import { DefinitionVersion } from "./DefinitionVersion";

export interface MigrationResult {
  readonly executionId: string;
  readonly success: boolean;
  readonly elapsedMs: number;
  readonly executedMigrations: readonly string[];
  readonly skippedMigrations: readonly string[];
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly finalVersion: DefinitionVersion;
}
