// src/shared/services/reporting/templates/ReportTemplateService.ts
import { Report } from "../../contracts/Report";
import { ComposedReport } from "./contracts/ComposedReport";
import { CompositionContext } from "./contracts/CompositionContext";
import { ReportTemplateRegistry, reportTemplateRegistry } from "./ReportTemplateRegistry";
import { SectionBuilderProvider } from "./SectionBuilderProvider";
import { HookRegistry, hookRegistry } from "./HookRegistry";
import { ReportComposer } from "./ReportComposer";

export class ReportTemplateService {
  private readonly composer: ReportComposer;

  constructor(
    private readonly templateRegistry: ReportTemplateRegistry = reportTemplateRegistry,
    private readonly builderProvider: SectionBuilderProvider = new SectionBuilderProvider(),
    private readonly hooks: HookRegistry = hookRegistry
  ) {
    this.composer = new ReportComposer(this.builderProvider, this.hooks);
  }

  public async composeReport(
    report: Report<unknown>,
    templateId: string,
    context: CompositionContext
  ): Promise<ComposedReport> {
    const template = this.templateRegistry.getTemplate(templateId);
    return this.composer.compose(report, template, context);
  }

  public getTemplateRegistry(): ReportTemplateRegistry {
    return this.templateRegistry;
  }

  public getHookRegistry(): HookRegistry {
    return this.hooks;
  }
}

const defaultTemplateService = new ReportTemplateService();
export default defaultTemplateService;
export { defaultTemplateService as reportTemplateService };
