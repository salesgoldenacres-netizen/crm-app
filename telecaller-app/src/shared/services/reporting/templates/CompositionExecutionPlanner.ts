// src/shared/services/reporting/templates/CompositionExecutionPlanner.ts
import { ReportTemplate, TemplateSection } from "./contracts/ReportTemplate";
import { SectionBuilderProvider } from "./SectionBuilderProvider";

export interface ExecutionPlan {
  readonly templateId: string;
  readonly templateVersion: string;
  readonly parallelGroups: readonly (readonly TemplateSection[])[];
  readonly executionOrder: readonly string[];
  readonly graphHash: string;
}

export class CompositionExecutionPlanner {
  constructor(private readonly provider: SectionBuilderProvider) {}

  public plan(template: ReportTemplate): ExecutionPlan {
    const enabledSections = template.sections.filter((s) => s.enabled);
    
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    
    const idToSection = new Map<string, TemplateSection>();
    const typeToSection = new Map<string, TemplateSection>();

    for (const section of enabledSections) {
      idToSection.set(section.id, section);
      typeToSection.set(section.type, section);
      inDegree.set(section.id, 0);
    }

    for (const section of enabledSections) {
      try {
        const builder = this.provider.resolve(section.type);
        const deps = builder.metadata.dependsOn || [];
        
        for (const depType of deps) {
          const parentSection = typeToSection.get(depType);
          if (parentSection) {
            const list = adj.get(parentSection.id) || [];
            list.push(section.id);
            adj.set(parentSection.id, list);
            inDegree.set(section.id, (inDegree.get(section.id) || 0) + 1);
          }
        }
      } catch {
        // Validation handles this
      }
    }

    let queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    const parallelGroups: TemplateSection[][] = [];
    const executionOrder: string[] = [];

    while (queue.length > 0) {
      const nextQueue: string[] = [];
      const currentGroup: TemplateSection[] = [];

      for (const id of queue) {
        const section = idToSection.get(id);
        if (section) {
          currentGroup.push(section);
          executionOrder.push(id);
        }

        const neighbors = adj.get(id) || [];
        for (const neighbor of neighbors) {
          const deg = (inDegree.get(neighbor) || 1) - 1;
          inDegree.set(neighbor, deg);
          if (deg === 0) {
            nextQueue.push(neighbor);
          }
        }
      }

      if (currentGroup.length > 0) {
        parallelGroups.push(Object.freeze(currentGroup));
      }
      queue = nextQueue;
    }

    const graphHash = `graph_${executionOrder.join("_")}`;

    const plan: ExecutionPlan = {
      templateId: template.templateId,
      templateVersion: template.version,
      parallelGroups: Object.freeze(parallelGroups.map((g) => Object.freeze(g))),
      executionOrder: Object.freeze(executionOrder),
      graphHash,
    };

    return Object.freeze(plan);
  }
}
