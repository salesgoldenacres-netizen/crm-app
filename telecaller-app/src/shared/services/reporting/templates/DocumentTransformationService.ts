// src/shared/services/reporting/templates/DocumentTransformationService.ts
import { ComposedReport } from "./contracts/ComposedReport";
import { RenderableDocument } from "./contracts/RenderableDocument";

export class DocumentTransformationService {
  public transform(report: ComposedReport): RenderableDocument {
    const document: RenderableDocument = {
      id: report.id,
      metadata: {
        templateId: report.templateId,
        generatedAt: report.generatedAt,
        executionId: report.manifest.executionId,
        correlationId: report.manifest.correlationId,
      },
      sections: report.sections,
      branding: report.branding,
      localization: report.localization,
    };

    return this.deepFreeze(document);
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

const defaultTransformationService = new DocumentTransformationService();
export default defaultTransformationService;
export { defaultTransformationService as documentTransformationService };
