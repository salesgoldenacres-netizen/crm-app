// src/shared/services/reporting/governance/contracts/MigrationPlan.ts
import { MigrationDefinition } from "./MigrationDefinition";
import { DefinitionVersion } from "./DefinitionVersion";

export interface MigrationPlan {
  readonly identityId: string;
  readonly sourceVersion: DefinitionVersion;
  readonly targetVersion: DefinitionVersion;
  readonly orderedMigrations: readonly MigrationDefinition[];
  readonly graphHash: string;
  readonly valid: boolean;
}
