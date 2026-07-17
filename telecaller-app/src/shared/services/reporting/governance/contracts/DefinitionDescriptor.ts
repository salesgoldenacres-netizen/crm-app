// src/shared/services/reporting/governance/contracts/DefinitionDescriptor.ts
import { DefinitionIdentity } from "./DefinitionIdentity";
import { DefinitionVersion } from "./DefinitionVersion";
import { LifecycleState } from "./LifecycleState";
import { VersionConstraint } from "./VersionConstraint";

export interface DefinitionDescriptor {
  readonly identity: DefinitionIdentity;
  readonly semanticVersion: DefinitionVersion;
  readonly lifecycleState: LifecycleState;
  readonly checksum: string;
  readonly dependencies: readonly {
    readonly identityId: string;
    readonly constraint: VersionConstraint;
  }[];
  readonly minimumEngineVersion: VersionConstraint;
}
