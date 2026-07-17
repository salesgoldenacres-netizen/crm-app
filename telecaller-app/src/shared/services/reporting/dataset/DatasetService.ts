// src/shared/services/reporting/dataset/DatasetService.ts
import { Report } from "../../contracts/Report";
import { DatasetKey } from "./contracts/DatasetKey";
import { DatasetFragment } from "./contracts/DatasetFragment";
import { ReportDataset } from "./contracts/ReportDataset";
import { DatasetContext } from "./contracts/DatasetContext";
import { DatasetManifest } from "./contracts/DatasetManifest";
import { DatasetProviderRegistry, datasetProviderRegistry } from "./DatasetProviderRegistry";
import { DatasetProviderResolver } from "./DatasetProviderResolver";
import { DatasetExecutionPlanner } from "./DatasetExecutionPlanner";
import { DatasetExecutionScheduler } from "./DatasetExecutionScheduler";
import { DatasetPipeline } from "./DatasetPipeline";
import { DatasetValidator } from "./DatasetValidator";
import { DatasetValidationError } from "./DatasetErrors";

export class DatasetService {
  private readonly planner: DatasetExecutionPlanner;
  private readonly pipeline: DatasetPipeline;
  private readonly validator: DatasetValidator;

  constructor(
    private readonly registry: DatasetProviderRegistry = datasetProviderRegistry,
    private readonly resolver: DatasetProviderResolver = new DatasetProviderResolver(registry),
    private readonly scheduler: DatasetExecutionScheduler = new DatasetExecutionScheduler(resolver)
  ) {
    this.planner = new DatasetExecutionPlanner(resolver);
    this.pipeline = new DatasetPipeline(scheduler, resolver);
    this.validator = new DatasetValidator(resolver);
  }

  public async generate(
    report: Report<unknown>,
    keys: readonly DatasetKey<DatasetFragment>[],
    context: DatasetContext
  ): Promise<ReportDataset> {
    const start = performance.now();

    const configValStart = performance.now();
    const configVal = this.validator.validateConfiguration(keys);
    const validationTime = performance.now() - configValStart;

    if (!configVal.valid) {
      const errs = configVal.messages.filter((m) => m.severity === "ERROR").map((m) => m.message).join("; ");
      throw new DatasetValidationError(`[DatasetService] Configuration validation failed: ${errs}`);
    }

    const plan = this.planner.plan(keys);

    const { results, warnings, parallelExecutionTime } = await this.pipeline.execute(
      plan,
      report,
      context
    );

    const runtimeVal = this.validator.validateRuntimeOutputs(results, warnings);
    if (!runtimeVal.valid) {
      const errs = runtimeVal.messages.filter((m) => m.severity === "ERROR").map((m) => m.message).join("; ");
      throw new DatasetValidationError(`[DatasetService] Runtime outputs validation failed: ${errs}`);
    }

    const durationMs = performance.now() - start;

    const manifest: DatasetManifest = {
      executionId: context.executionId,
      correlationId: context.correlationId,
      plannerVersion: "1.0.0",
      builderGraphHash: plan.graphHash,
      generationTimestamp: new Date().toISOString(),
      durationMs,
      providerCount: keys.length,
      parallelGroupCount: plan.parallelGroups.length,
      parallelExecutionTime,
      validationTime,
      warnings,
    };

    const reportDataset: ReportDataset = {
      manifest,
      get: <T extends DatasetFragment>(key: DatasetKey<T>): T => {
        const item = results.get(key.id);
        if (!item) {
          throw new Error(`[ReportDataset] Fragment for key ${key.id} was not found in dataset.`);
        }
        return item as T;
      },
      tryGet: <T extends DatasetFragment>(key: DatasetKey<T>): T | undefined => {
        return results.get(key.id) as T | undefined;
      },
      has: (key: DatasetKey<unknown>): boolean => {
        return results.has(key.id);
      },
      fragments: (): readonly DatasetKey<DatasetFragment>[] => {
        return keys;
      },
    };

    return this.deepFreeze(reportDataset);
  }

  public getPipeline(): DatasetPipeline {
    return this.pipeline;
  }

  public getRegistry(): DatasetProviderRegistry {
    return this.registry;
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

const defaultDatasetService = new DatasetService();
export default defaultDatasetService;
export { defaultDatasetService as datasetService };
