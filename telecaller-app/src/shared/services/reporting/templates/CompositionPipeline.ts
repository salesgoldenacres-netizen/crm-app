// src/shared/services/reporting/templates/CompositionPipeline.ts
import { ExecutionPlan } from "./CompositionExecutionPlanner";
import { Report } from "../../contracts/Report";
import { CompositionContext } from "./contracts/CompositionContext";
import { ReportSection } from "./contracts/ReportSection";
import { HookRegistry, CompositionHookContext } from "./HookRegistry";
import { ExecutionScheduler } from "./ExecutionScheduler";
import { SectionBuilderProvider } from "./SectionBuilderProvider";

export class CompositionPipeline {
  private readonly scheduler: ExecutionScheduler;

  constructor(
    private readonly provider: SectionBuilderProvider,
    private readonly hookRegistry: HookRegistry
  ) {
    this.scheduler = new ExecutionScheduler(this.provider);
  }

  public async execute(
    plan: ExecutionPlan,
    report: Report<unknown>,
    context: CompositionContext
  ): Promise<{ sections: ReportSection[]; warnings: string[]; parallelExecutionTime: number }> {
    const hookCtx = (stage: "beforeComposition" | "beforeSection" | "afterSection" | "afterComposition", sectionId?: string): CompositionHookContext => ({
      templateId: plan.templateId,
      executionId: context.executionId,
      correlationId: context.correlationId,
      stage,
      sectionId,
      generatedAt: new Date().toISOString(),
    });

    const beforeCompHooks = this.hookRegistry.getHooks("beforeComposition");
    for (const hook of beforeCompHooks) {
      await hook.execute(hookCtx("beforeComposition"));
    }

    const schedulerResult = await this.scheduler.schedule(
      plan,
      report,
      context,
      async (sectionId) => {
        const hooks = this.hookRegistry.getHooks("beforeSection");
        for (const hook of hooks) {
          await hook.execute(hookCtx("beforeSection", sectionId));
        }
      },
      async (sectionId) => {
        const hooks = this.hookRegistry.getHooks("afterSection");
        for (const hook of hooks) {
          await hook.execute(hookCtx("afterSection", sectionId));
        }
      }
    );

    const afterCompHooks = this.hookRegistry.getHooks("afterComposition");
    for (const hook of afterCompHooks) {
      await hook.execute(hookCtx("afterComposition"));
    }

    return schedulerResult;
  }
}
