// src/shared/services/reporting/templates/TemplateValidator.ts
import { ReportTemplate } from "./contracts/ReportTemplate";
import { SectionBuilderProvider } from "./SectionBuilderProvider";
import { ValidationMessage, CompositionValidationResult } from "./CompositionValidator";

export class TemplateValidator {
  constructor(private readonly provider: SectionBuilderProvider) {}

  public validate(template: ReportTemplate): CompositionValidationResult {
    const messages: ValidationMessage[] = [];
    let valid = true;

    const sectionIds = new Set<string>();
    for (const section of template.sections) {
      if (sectionIds.has(section.id)) {
        valid = false;
        messages.push({
          severity: "ERROR",
          message: `[TemplateValidator] Duplicate section ID: ${section.id}`,
        });
      }
      sectionIds.add(section.id);

      try {
        const builder = this.provider.resolve(section.type);
        if (!builder) {
          valid = false;
          messages.push({
            severity: "ERROR",
            message: `[TemplateValidator] Resolved builder is undefined for type: ${section.type}`,
          });
        }
      } catch (err: any) {
        valid = false;
        messages.push({
          severity: "ERROR",
          message: `[TemplateValidator] Missing builder for section type: ${section.type}. Error: ${err.message}`,
        });
      }
    }

    const adj = new Map<string, string[]>();
    const enabledTypes = new Set<string>(
      template.sections.filter((s) => s.enabled).map((s) => s.type)
    );

    for (const section of template.sections) {
      if (!section.enabled) continue;
      try {
        const builder = this.provider.resolve(section.type);
        const deps = builder.metadata.dependsOn || [];
        adj.set(section.type, [...deps]);

        for (const dep of deps) {
          if (!enabledTypes.has(dep)) {
            messages.push({
              severity: "WARNING",
              message: `[TemplateValidator] Section type ${section.type} depends on ${dep}, but ${dep} is not enabled in template.`,
            });
          }
        }
      } catch {
        // missing builder errors are caught above
      }
    }

    const visited = new Map<string, number>(); 
    const hasCycle = (u: string): boolean => {
      visited.set(u, 1);
      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        if (visited.get(v) === 1) return true;
        if (!visited.has(v)) {
          if (hasCycle(v)) return true;
        }
      }
      visited.set(u, 2);
      return false;
    };

    for (const type of adj.keys()) {
      if (!visited.has(type)) {
        if (hasCycle(type)) {
          valid = false;
          messages.push({
            severity: "ERROR",
            message: `[TemplateValidator] Circular dependency detected involving section type: ${type}`,
          });
        }
      }
    }

    return Object.freeze({
      valid,
      messages: Object.freeze(messages),
    });
  }
}
