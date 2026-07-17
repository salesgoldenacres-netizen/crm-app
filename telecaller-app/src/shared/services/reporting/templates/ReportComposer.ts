// src/shared/services/reporting/templates/ReportComposer.ts
import { Report } from "../../contracts/Report";
import { ReportTemplate } from "./contracts/ReportTemplate";
import { ComposedReport } from "./contracts/ComposedReport";
import { CompositionContext } from "./contracts/CompositionContext";
import { CompositionManifest } from "./contracts/CompositionManifest";
import { SectionBuilderProvider } from "./SectionBuilderProvider";
import { HookRegistry } from "./HookRegistry";
import { TemplateValidator } from "./TemplateValidator";
import { CompositionValidator } from "./CompositionValidator";
import { CompositionExecutionPlanner } from "./CompositionExecutionPlanner";
import { CompositionPipeline } from "./CompositionPipeline";
import { CompositionError } from "./TemplateErrors";

export class ReportComposer {
  public readonly metadata = {
    id: "ReportComposer",
    version: "1.0.0",
    engineVersion: "1.4.0",
    buildDate: "2026-07-17",
  };

  private readonly templateValidator: TemplateValidator;
  private readonly compositionValidator: CompositionValidator;
  private readonly planner: CompositionExecutionPlanner;
  private readonly pipeline: CompositionPipeline;

  constructor(
    private readonly provider: SectionBuilderProvider,
    private readonly hookRegistry: HookRegistry
  ) {
    this.templateValidator = new TemplateValidator(this.provider);
    this.compositionValidator = new CompositionValidator();
    this.planner = new CompositionExecutionPlanner(this.provider);
    this.pipeline = new CompositionPipeline(this.provider, this.hookRegistry);
  }

  public async compose(
    report: Report<unknown>,
    template: ReportTemplate,
    context: CompositionContext
  ): Promise<ComposedReport> {
    const start = performance.now();

    const validationStart = performance.now();
    const tempVal = this.templateValidator.validate(template);
    const validationTime = performance.now() - validationStart;

    if (!tempVal.valid) {
      const errorMsg = tempVal.messages
        .filter((m) => m.severity === "ERROR")
        .map((m) => m.message)
        .join("; ");
      throw new CompositionError(`[ReportComposer] Template validation failed: ${errorMsg}`);
    }

    const plan = this.planner.plan(template);

    const { sections, warnings, parallelExecutionTime } = await this.pipeline.execute(
      plan,
      report,
      context
    );

    const compVal = this.compositionValidator.validate(sections, warnings);
    if (!compVal.valid) {
      const errorMsg = compVal.messages
        .filter((m) => m.severity === "ERROR")
        .map((m) => m.message)
        .join("; ");
      throw new CompositionError(`[ReportComposer] Runtime composition validation failed: ${errorMsg}`);
    }

    const templateOrder = template.sections.map((s) => s.id);
    const sortedSections = [...sections].sort(
      (a, b) => templateOrder.indexOf(a.id) - templateOrder.indexOf(b.id)
    );

    const totalDurationMs = performance.now() - start;

    const manifest: CompositionManifest = {
      templateId: template.templateId,
      templateVersion: template.version,
      composerVersion: this.metadata.version,
      executionId: context.executionId,
      correlationId: context.correlationId,
      templateHash: `template_md5_${template.templateId}_v${template.version}`,
      configurationHash: `config_sha256_${JSON.stringify(template.sections.map((s) => s.configuration))}`,
      builderGraphHash: plan.graphHash,
      generatedBy: context.generatedBy,
      generatedAt: context.generatedAt,
      durationMs: totalDurationMs,
      builderCount: template.sections.filter((s) => s.enabled).length,
      parallelGroupCount: plan.parallelGroups.length,
      parallelExecutionTime,
      validationTime,
      serializationTime: 0,
      sectionCount: sortedSections.length,
      warnings: warnings,
    };

    const composedReport: ComposedReport = {
      id: `report_${context.executionId}`,
      templateId: template.templateId,
      manifest,
      branding: context.branding,
      localization: context.localization,
      sections: sortedSections,
      generatedAt: context.generatedAt,
    };

    return this.deepFreeze(composedReport);
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
