// src/shared/services/reporting/governance/contracts/DefinitionVersion.ts
export class DefinitionVersion {
  public readonly major: number;
  public readonly minor: number;
  public readonly patch: number;
  public readonly rawString: string;

  constructor(major: number, minor: number, patch: number) {
    this.major = major;
    this.minor = minor;
    this.patch = patch;
    this.rawString = `${major}.${minor}.${patch}`;
    Object.freeze(this);
  }

  public static parse(versionString: string): DefinitionVersion {
    const clean = versionString.trim().replace(/^v/, "");
    const parts = clean.split(".");
    if (parts.length !== 3) {
      throw new Error(`[DefinitionVersion] Invalid semantic version string: ${versionString}`);
    }
    const major = parseInt(parts[0], 10);
    const minor = parseInt(parts[1], 10);
    const patch = parseInt(parts[2], 10);

    if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
      throw new Error(`[DefinitionVersion] Invalid semantic version digits: ${versionString}`);
    }

    return new DefinitionVersion(major, minor, patch);
  }

  public compare(other: DefinitionVersion): number {
    if (this.major !== other.major) {
      return this.major > other.major ? 1 : -1;
    }
    if (this.minor !== other.minor) {
      return this.minor > other.minor ? 1 : -1;
    }
    if (this.patch !== other.patch) {
      return this.patch > other.patch ? 1 : -1;
    }
    return 0;
  }

  public equals(other: DefinitionVersion): boolean {
    return this.compare(other) === 0;
  }

  public isBefore(other: DefinitionVersion): boolean {
    return this.compare(other) < 0;
  }

  public isAfter(other: DefinitionVersion): boolean {
    return this.compare(other) > 0;
  }

  public isCompatibleMajor(other: DefinitionVersion): boolean {
    return this.major === other.major;
  }
}
