// src/shared/services/reporting/templates/TemplateErrors.ts
export class TemplateError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TemplateError";
  }
}

export class TemplateNotFoundError extends TemplateError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TemplateNotFoundError";
  }
}

export class DuplicateTemplateError extends TemplateError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DuplicateTemplateError";
  }
}

export class SectionBuildError extends TemplateError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SectionBuildError";
  }
}

export class CompositionError extends TemplateError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CompositionError";
  }
}
