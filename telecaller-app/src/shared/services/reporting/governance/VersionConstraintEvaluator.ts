// src/shared/services/reporting/governance/VersionConstraintEvaluator.ts
import { DefinitionVersion } from "./contracts/DefinitionVersion";
import { VersionConstraint } from "./contracts/VersionConstraint";

export class VersionConstraintEvaluator {
  public evaluate(version: DefinitionVersion, constraint: VersionConstraint): boolean {
    const comp = version.compare(constraint.version);

    switch (constraint.operator) {
      case "=":
        return comp === 0;
      case ">":
        return comp > 0;
      case "<":
        return comp < 0;
      case ">=":
        return comp >= 0;
      case "<=":
        return comp <= 0;
      case "^":
        return version.major === constraint.version.major && comp >= 0;
      case "~":
        return (
          version.major === constraint.version.major &&
          version.minor === constraint.version.minor &&
          comp >= 0
        );
      default:
        return false;
    }
  }
}

const defaultConstraintEvaluator = new VersionConstraintEvaluator();
export default defaultConstraintEvaluator;
export { defaultConstraintEvaluator as versionConstraintEvaluator };
