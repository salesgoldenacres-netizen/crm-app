// src/shared/services/reporting/governance/contracts/MigrationDefinition.ts
import { DefinitionVersion } from "./DefinitionVersion";

export interface MigrationDefinition {
  readonly migrationId: string;
  readonly identityId: string;
  readonly sourceVersion: DefinitionVersion;
  readonly targetVersion: DefinitionVersion;
  readonly description: string;
}
