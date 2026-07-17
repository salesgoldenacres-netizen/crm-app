// src/shared/services/reporting/governance/contracts/VersionConstraint.ts
import { DefinitionVersion } from "./DefinitionVersion";

export class VersionConstraint {
  public readonly operator: ">" | "<" | ">=" | "<=" | "=" | "^" | "~";
  public readonly version: DefinitionVersion;
  public readonly rawConstraint: string;

  constructor(operator: ">" | "<" | ">=" | "<=" | "=" | "^" | "~", version: DefinitionVersion, rawConstraint: string) {
    this.operator = operator;
    this.version = version;
    this.rawConstraint = rawConstraint;
    Object.freeze(this);
  }

  public static parse(constraintString: string): VersionConstraint {
    const clean = constraintString.trim();
    let operator: ">" | "<" | ">=" | "<=" | "=" | "^" | "~" = "=";
    let versionStr = clean;

    if (clean.startsWith(">=")) {
      operator = ">=";
      versionStr = clean.slice(2);
    } else if (clean.startsWith("<=")) {
      operator = "<=";
      versionStr = clean.slice(2);
    } else if (clean.startsWith(">")) {
      operator = ">";
      versionStr = clean.slice(1);
    } else if (clean.startsWith("<")) {
      operator = "<";
      versionStr = clean.slice(1);
    } else if (clean.startsWith("^")) {
      operator = "^";
      versionStr = clean.slice(1);
    } else if (clean.startsWith("~")) {
      operator = "~";
      versionStr = clean.slice(1);
    } else if (clean.startsWith("=")) {
      operator = "=";
      versionStr = clean.slice(1);
    }

    const version = DefinitionVersion.parse(versionStr);
    return new VersionConstraint(operator, version, clean);
  }
}
