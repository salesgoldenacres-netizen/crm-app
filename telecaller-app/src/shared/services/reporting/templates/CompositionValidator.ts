// src/shared/services/reporting/templates/CompositionValidator.ts
export interface ValidationMessage {
  readonly severity: "INFO" | "WARNING" | "ERROR";
  readonly message: string;
}

export interface CompositionValidationResult {
  readonly valid: boolean;
  readonly messages: readonly ValidationMessage[];
}

export class CompositionValidator {
  public validate(sections: any[], warnings: string[]): CompositionValidationResult {
    const messages: ValidationMessage[] = [];
    let valid = true;

    for (const w of warnings) {
      messages.push({
        severity: "WARNING",
        message: w,
      });
    }

    if (sections.length === 0) {
      valid = false;
      messages.push({
        severity: "ERROR",
        message: "[CompositionValidator] Report composed with 0 sections.",
      });
    }

    for (const section of sections) {
      if (!section) {
        valid = false;
        messages.push({
          severity: "ERROR",
          message: "[CompositionValidator] Found undefined or null section output.",
        });
        continue;
      }
      if (section.content === undefined || section.content === null) {
        messages.push({
          severity: "WARNING",
          message: `[CompositionValidator] Section ${section.id} has empty content.`,
        });
      }
    }

    return Object.freeze({
      valid,
      messages: Object.freeze(messages),
    });
  }
}
