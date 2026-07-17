// src/shared/services/reporting/dataset/DatasetPipeline.ts
import { DatasetContext } from "./contracts/DatasetContext";
import { DatasetProvider } from "./contracts/DatasetProvider";
import { DatasetFragment } from "./contracts/DatasetFragment";
import { DatasetExecutionPlan } from "./contracts/DatasetExecutionPlan";
import { Report } from "../../contracts/Report";
import { DatasetExecutionScheduler } from "./DatasetExecutionScheduler";
import { DatasetProviderResolver } from "./DatasetProviderResolver";

export interface DatasetMiddlewareContext {
  readonly context: DatasetContext;
  readonly report: Report<unknown>;
  readonly provider: DatasetProvider;
}

export type DatasetMiddlewareNext = () => Promise<DatasetFragment>;

export interface DatasetMiddleware {
  readonly id: string;
  execute(ctx: DatasetMiddlewareContext, next: DatasetMiddlewareNext): Promise<DatasetFragment>;
}

export class DatasetPipeline {
  private middlewares: DatasetMiddleware[] = [];

  constructor(
    private readonly scheduler: DatasetExecutionScheduler,
    private readonly resolver: DatasetProviderResolver
  ) {}

  public use(middleware: DatasetMiddleware): void {
    this.middlewares.push(middleware);
  }

  public async execute(
    plan: DatasetExecutionPlan,
    report: Report<unknown>,
    context: DatasetContext
  ): Promise<{ results: Map<string, DatasetFragment>; warnings: string[]; parallelExecutionTime: number }> {
    const runProviderWithMiddleware = async (provider: DatasetProvider): Promise<DatasetFragment> => {
      let index = 0;
      const next = async (): Promise<DatasetFragment> => {
        if (index < this.middlewares.length) {
          const middleware = this.middlewares[index++];
          return middleware.execute(
            { context, report, provider },
            next
          );
        }
        return provider.provide({ report, context });
      };
      return next();
    };

    const wrappedResolver = {
      resolve: (key: any) => {
        const originalProvider = this.resolver.resolve(key);
        return {
          metadata: originalProvider.metadata,
          provide: async () => runProviderWithMiddleware(originalProvider),
        } as DatasetProvider;
      }
    };

    const tempScheduler = new DatasetExecutionScheduler(wrappedResolver as any);
    return tempScheduler.schedule(plan, report, context);
  }
}
