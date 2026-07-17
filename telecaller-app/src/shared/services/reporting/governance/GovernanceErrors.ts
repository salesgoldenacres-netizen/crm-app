// src/shared/services/reporting/governance/GovernanceErrors.ts
export class GovernanceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "GovernanceError";
  }
}

export class DuplicateDefinitionError extends GovernanceError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DuplicateDefinitionError";
  }
}

export class InvalidLifecycleTransitionError extends GovernanceError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "InvalidLifecycleTransitionError";
  }
}

export class VersionConflictError extends GovernanceError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "VersionConflictError";
  }
}

export class MigrationPathNotFoundError extends GovernanceError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MigrationPathNotFoundError";
  }
}
