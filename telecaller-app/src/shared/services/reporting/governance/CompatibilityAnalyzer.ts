// src/shared/services/reporting/governance/CompatibilityAnalyzer.ts
import { DefinitionDescriptor } from "./contracts/DefinitionDescriptor";
import { DefinitionVersion } from "./contracts/DefinitionVersion";
import { CompatibilityReport } from "./contracts/CompatibilityReport";
import { VersionConstraintEvaluator } from "./VersionConstraintEvaluator";
import { DefinitionRegistry } from "./DefinitionRegistry";

export class CompatibilityAnalyzer {
  constructor(
    private readonly registry: DefinitionRegistry,
    private readonly evaluator: VersionConstraintEvaluator
  ) {}

  public analyze(
    descriptor: DefinitionDescriptor,
    engineVersion: DefinitionVersion
  ): CompatibilityReport {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredMigrations: string[] = [];

    const engineCompatible = this.evaluator.evaluate(
      engineVersion,
      descriptor.minimumEngineVersion
    );

    if (!engineCompatible) {
      errors.push(
        `[CompatibilityAnalyzer] Definition requires engine version satisfying ${descriptor.minimumEngineVersion.rawConstraint}, but got v${engineVersion.rawString}`
      );
    }

    if (descriptor.lifecycleState === "Deprecated") {
      warnings.push(
        `[CompatibilityAnalyzer] Definition ${descriptor.identity.id} is Deprecated and should be migrated.`
      );
    } else if (descriptor.lifecycleState === "Sunset") {
      warnings.push(
        `[CompatibilityAnalyzer] Definition ${descriptor.identity.id} is in Sunset phase. Migration is mandatory.`
      );
    } else if (descriptor.lifecycleState === "Removed") {
      errors.push(
        `[CompatibilityAnalyzer] Definition ${descriptor.identity.id} is Removed and cannot be used.`
      );
    }

    for (const dep of descriptor.dependencies) {
      const allVersions = this.registry.getAllVersions(dep.identityId);
      const matchingVersion = allVersions.find((d) =>
        this.evaluator.evaluate(d.semanticVersion, dep.constraint)
      );

      if (!matchingVersion) {
        errors.push(
          `[CompatibilityAnalyzer] Missing dependency ${dep.identityId} satisfying constraint ${dep.constraint.rawConstraint}`
        );
      } else if (matchingVersion.lifecycleState === "Deprecated" || matchingVersion.lifecycleState === "Sunset") {
        warnings.push(
          `[CompatibilityAnalyzer] Dependency ${dep.identityId} resolved to version v${matchingVersion.semanticVersion.rawString} which is in lifecycle state: ${matchingVersion.lifecycleState}`
        );
      }
    }

    const isCompatible = errors.length === 0;
    const compatibilityLevel =
      errors.length > 0 ? "incompatible" : warnings.length > 0 ? "partial" : "full";

    const report: CompatibilityReport = {
      isCompatible,
      compatibilityLevel,
      evaluatedEngineVersion: engineVersion,
      warnings: Object.freeze(warnings),
      errors: Object.freeze(errors),
      requiredMigrations: Object.freeze(requiredMigrations),
    };

    return Object.freeze(report);
  }
}
