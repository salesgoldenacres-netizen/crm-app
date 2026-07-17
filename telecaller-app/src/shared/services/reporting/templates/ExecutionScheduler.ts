// src/shared/services/reporting/templates/ExecutionScheduler.ts
import { ExecutionPlan } from "./CompositionExecutionPlanner";
import { Report } from "../../contracts/Report";
import { CompositionContext } from "./contracts/CompositionContext";
import { ReportSection } from "./contracts/ReportSection";
import { SectionBuilderProvider } from "./SectionBuilderProvider";
import { SectionBuildError } from "./TemplateErrors";

export class ExecutionScheduler {
  constructor(private readonly provider: SectionBuilderProvider) {}

  public async schedule(
    plan: ExecutionPlan,
    report: Report<unknown>,
    context: CompositionContext,
    onBeforeSection: (sectionId: string) => Promise<void>,
    onAfterSection: (sectionId: string) => Promise<void>
  ): Promise<{ sections: ReportSection[]; warnings: string[]; parallelExecutionTime: number }> {
    const warnings: string[] = [];
    const sections: ReportSection[] = [];
    const executionStart = performance.now();

    for (const group of plan.parallelGroups) {
      if (context.cancellationToken?.isCancelled) {
        throw new Error("[ExecutionScheduler] Composition was cancelled.");
      }

      const groupResults = await Promise.all(
        group.map(async (section) => {
          if (context.cancellationToken?.isCancelled) {
            throw new Error("[ExecutionScheduler] Composition was cancelled.");
          }

          await onBeforeSection(section.id);
          const builder = this.provider.resolve(section.type);
          const builderStart = performance.now();

          try {
            const output = await builder.build({
              report,
              context,
              configuration: section.configuration || {},
            });

            const finalSection: ReportSection = {
              ...output,
              id: section.id,
              metadata: {
                ...output.metadata,
                order: plan.executionOrder.indexOf(section.id),
                builderId: builder.metadata.id,
                builderVersion: builder.metadata.version,
                executionDurationMs: performance.now() - builderStart,
                generatedAt: new Date().toISOString(),
              },
            };

            await onAfterSection(section.id);
            return Object.freeze(finalSection);
          } catch (err: any) {
            throw new SectionBuildError(
              `[ExecutionScheduler] Section build failed for ${section.id}: ${err.message}`,
              { cause: err }
            );
          }
        })
      );

      sections.push(...groupResults);
    }

    const parallelExecutionTime = performance.now() - executionStart;
    return {
      sections,
      warnings,
      parallelExecutionTime,
    };
  }
}
