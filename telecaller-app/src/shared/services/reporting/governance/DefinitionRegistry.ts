// src/shared/services/reporting/governance/DefinitionRegistry.ts
import { DefinitionDescriptor } from "./contracts/DefinitionDescriptor";
import { DuplicateDefinitionError } from "./GovernanceErrors";

export class DefinitionRegistry {
  private descriptors = new Map<string, Map<string, DefinitionDescriptor>>();

  public register(descriptor: DefinitionDescriptor): void {
    const id = descriptor.identity.id;
    const versionStr = descriptor.semanticVersion.rawString;

    let versions = this.descriptors.get(id);
    if (!versions) {
      versions = new Map<string, DefinitionDescriptor>();
      this.descriptors.set(id, versions);
    }

    if (versions.has(versionStr)) {
      throw new DuplicateDefinitionError(
        `[DefinitionRegistry] Definition descriptor ${id} v${versionStr} is already registered.`
      );
    }

    versions.set(versionStr, descriptor);
  }

  public getDescriptor(id: string, versionStr: string): DefinitionDescriptor | undefined {
    return this.descriptors.get(id)?.get(versionStr);
  }

  public getAllVersions(id: string): readonly DefinitionDescriptor[] {
    const versions = this.descriptors.get(id);
    return versions ? Array.from(versions.values()) : [];
  }

  public enumerate(): readonly DefinitionDescriptor[] {
    const all: DefinitionDescriptor[] = [];
    for (const versions of this.descriptors.values()) {
      all.push(...versions.values());
    }
    return Object.freeze(all);
  }

  public clear(): void {
    this.descriptors.clear();
  }
}

const defaultDefinitionRegistry = new DefinitionRegistry();
export default defaultDefinitionRegistry;
export { defaultDefinitionRegistry as definitionRegistry };
