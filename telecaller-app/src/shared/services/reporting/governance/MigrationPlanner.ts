// src/shared/services/reporting/governance/MigrationPlanner.ts
import { DefinitionVersion } from "./contracts/DefinitionVersion";
import { MigrationDefinition } from "./contracts/MigrationDefinition";
import { MigrationPlan } from "./contracts/MigrationPlan";
import { MigrationPathNotFoundError, VersionConflictError } from "./GovernanceErrors";

export class MigrationPlanner {
  private migrations = new Map<string, MigrationDefinition[]>();

  public registerMigration(migration: MigrationDefinition): void {
    const list = this.migrations.get(migration.identityId) || [];
    list.push(migration);
    this.migrations.set(migration.identityId, list);
  }

  public plan(
    identityId: string,
    source: DefinitionVersion,
    target: DefinitionVersion
  ): MigrationPlan {
    const available = this.migrations.get(identityId) || [];
    const orderedMigrations: MigrationDefinition[] = [];

    let current = source;
    
    while (!current.equals(target)) {
      const step = available.find((m) => m.sourceVersion.equals(current));
      if (!step) {
        throw new MigrationPathNotFoundError(
          `[MigrationPlanner] No valid migration step found from v${current.rawString} to reach target v${target.rawString}.`
        );
      }

      orderedMigrations.push(step);
      current = step.targetVersion;

      if (orderedMigrations.length > available.length) {
        throw new VersionConflictError(
          "[MigrationPlanner] Loop detected in registered migration paths."
        );
      }
    }

    const graphHash = `migration_${identityId}_${source.rawString}_to_${target.rawString}_steps_${orderedMigrations.length}`;

    const plan: MigrationPlan = {
      identityId,
      sourceVersion: source,
      targetVersion: target,
      orderedMigrations: Object.freeze(orderedMigrations),
      graphHash,
      valid: true,
    };

    return Object.freeze(plan);
  }

  public clear(): void {
    this.migrations.clear();
  }
}
