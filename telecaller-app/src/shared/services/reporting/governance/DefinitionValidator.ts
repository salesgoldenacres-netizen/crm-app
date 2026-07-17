// src/shared/services/reporting/governance/DefinitionValidator.ts
import { DefinitionDescriptor } from "./contracts/DefinitionDescriptor";
import { LifecycleState } from "./contracts/LifecycleState";
import { InvalidLifecycleTransitionError, GovernanceError } from "./GovernanceErrors";

export class DefinitionValidator {
  public validate(descriptor: DefinitionDescriptor): void {
    if (!descriptor.identity.id) {
      throw new GovernanceError("[DefinitionValidator] Identity ID is empty.");
    }
    if (!descriptor.semanticVersion.rawString) {
      throw new GovernanceError("[DefinitionValidator] Semantic version is empty.");
    }
    if (!descriptor.checksum) {
      throw new GovernanceError("[DefinitionValidator] Checksum is empty.");
    }
  }

  public validateLifecycleTransition(
    current: LifecycleState,
    target: LifecycleState
  ): void {
    if (current === target) return;

    const hierarchy = ["Experimental", "Active", "Deprecated", "Sunset", "Removed"];
    const curIdx = hierarchy.indexOf(current);
    const tarIdx = hierarchy.indexOf(target);

    if (target === "Removed") return;

    if (tarIdx < curIdx) {
      throw new InvalidLifecycleTransitionError(
        `[DefinitionValidator] Invalid lifecycle rollback from ${current} to ${target}.`
      );
    }
  }
}
