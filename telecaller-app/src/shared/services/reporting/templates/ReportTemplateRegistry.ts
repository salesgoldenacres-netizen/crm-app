// src/shared/services/reporting/templates/ReportTemplateRegistry.ts
import { ReportTemplate } from "./contracts/ReportTemplate";
import { DuplicateTemplateError, TemplateNotFoundError } from "./TemplateErrors";

export class ReportTemplateRegistry {
  private templates = new Map<string, ReportTemplate>();

  public register(template: ReportTemplate): void {
    const id = template.templateId;
    if (this.templates.has(id)) {
      throw new DuplicateTemplateError(`[ReportTemplateRegistry] Template ${id} already exists.`);
    }
    this.templates.set(id, this.deepFreeze(template));
  }

  public getTemplate(id: string): ReportTemplate {
    const template = this.templates.get(id);
    if (!template) {
      throw new TemplateNotFoundError(`[ReportTemplateRegistry] Template ${id} not found.`);
    }
    return template;
  }

  public clear(): void {
    this.templates.clear();
  }

  private deepFreeze(obj: any): any {
    if (obj && typeof obj === "object") {
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach((prop) => {
        this.deepFreeze(obj[prop]);
      });
    }
    return obj;
  }
}

const defaultTemplateRegistry = new ReportTemplateRegistry();
export default defaultTemplateRegistry;
export { defaultTemplateRegistry as reportTemplateRegistry };
