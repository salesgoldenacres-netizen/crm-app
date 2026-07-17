// src/shared/services/reporting/governance/DefinitionResolver.ts
import { DefinitionRegistry } from "./DefinitionRegistry";
import { DefinitionDescriptor } from "./contracts/DefinitionDescriptor";
import { DefinitionVersion } from "./contracts/DefinitionVersion";
import { VersionConstraintEvaluator } from "./VersionConstraintEvaluator";

export class DefinitionResolver {
  constructor(
    private readonly registry: DefinitionRegistry,
    private readonly evaluator: VersionConstraintEvaluator
  ) {}

  public resolveActive(
    id: string,
    engineVersion: DefinitionVersion
  ): DefinitionDescriptor | undefined {
    const allVersions = this.registry.getAllVersions(id);
    
    const candidates = allVersions.filter((desc) => {
      if (desc.lifecycleState === "Removed") return false;
      return this.evaluator.evaluate(engineVersion, desc.minimumEngineVersion);
    });

    if (candidates.length === 0) return undefined;

    return candidates.reduce((highest, current) => {
      return current.semanticVersion.compare(highest.semanticVersion) > 0 ? current : highest;
    });
  }
}
