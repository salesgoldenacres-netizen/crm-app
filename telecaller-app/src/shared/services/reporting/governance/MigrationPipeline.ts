// src/shared/services/reporting/governance/MigrationPipeline.ts
import { MigrationPlan } from "./contracts/MigrationPlan";
import { MigrationResult } from "./contracts/MigrationResult";

export class MigrationPipeline {
  public async execute(plan: MigrationPlan): Promise<MigrationResult> {
    const start = performance.now();
    const executedMigrations: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const step of plan.orderedMigrations) {
      try {
        executedMigrations.push(step.migrationId);
      } catch (err: any) {
        errors.push(`[MigrationPipeline] Step ${step.migrationId} failed: ${err.message}`);
      }
    }

    const success = errors.length === 0;
    const finalVersion = success && plan.orderedMigrations.length > 0
      ? plan.orderedMigrations[plan.orderedMigrations.length - 1].targetVersion
      : plan.sourceVersion;

    const result: MigrationResult = {
      executionId: `mig_exec_${Math.random().toString(36).slice(2, 9)}`,
      success,
      elapsedMs: performance.now() - start,
      executedMigrations: Object.freeze(executedMigrations),
      skippedMigrations: Object.freeze([]),
      warnings: Object.freeze(warnings),
      errors: Object.freeze(errors),
      finalVersion,
    };

    return Object.freeze(result);
  }
}
