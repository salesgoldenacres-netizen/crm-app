// src/shared/services/reporting/governance/GovernanceService.ts
import { DefinitionRegistry, definitionRegistry } from "./DefinitionRegistry";
import { DefinitionResolver } from "./DefinitionResolver";
import { VersionConstraintEvaluator, versionConstraintEvaluator } from "./VersionConstraintEvaluator";
import { DefinitionValidator } from "./DefinitionValidator";
import { CompatibilityAnalyzer } from "./CompatibilityAnalyzer";
import { MigrationPlanner } from "./MigrationPlanner";
import { MigrationPipeline } from "./MigrationPipeline";
import { DefinitionDescriptor } from "./contracts/DefinitionDescriptor";
import { DefinitionVersion } from "./contracts/DefinitionVersion";
import { CompatibilityReport } from "./contracts/CompatibilityReport";
import { MigrationPlan } from "./contracts/MigrationPlan";
import { MigrationResult } from "./contracts/MigrationResult";

export class GovernanceService {
  private readonly validator: DefinitionValidator;
  private readonly resolver: DefinitionResolver;
  private readonly analyzer: CompatibilityAnalyzer;
  private readonly planner: MigrationPlanner;
  private readonly pipeline: MigrationPipeline;

  constructor(
    private readonly registry: DefinitionRegistry = definitionRegistry,
    private readonly evaluator: VersionConstraintEvaluator = versionConstraintEvaluator
  ) {
    this.validator = new DefinitionValidator();
    this.resolver = new DefinitionResolver(registry, evaluator);
    this.analyzer = new CompatibilityAnalyzer(registry, evaluator);
    this.planner = new MigrationPlanner();
    this.pipeline = new MigrationPipeline();
  }

  public registerDefinition(descriptor: DefinitionDescriptor): void {
    this.validator.validate(descriptor);
    this.registry.register(descriptor);
  }

  public resolveActiveDefinition(
    id: string,
    engineVersion: DefinitionVersion
  ): DefinitionDescriptor | undefined {
    return this.resolver.resolveActive(id, engineVersion);
  }

  public analyzeCompatibility(
    descriptor: DefinitionDescriptor,
    engineVersion: DefinitionVersion
  ): CompatibilityReport {
    return this.analyzer.analyze(descriptor, engineVersion);
  }

  public planMigration(
    identityId: string,
    source: DefinitionVersion,
    target: DefinitionVersion
  ): MigrationPlan {
    return this.planner.plan(identityId, source, target);
  }

  public async executeMigration(plan: MigrationPlan): Promise<MigrationResult> {
    return this.pipeline.execute(plan);
  }

  public getRegistry(): DefinitionRegistry {
    return this.registry;
  }

  public getPlanner(): MigrationPlanner {
    return this.planner;
  }

  public getValidator(): DefinitionValidator {
    return this.validator;
  }
}

const defaultGovernanceService = new GovernanceService();
export default defaultGovernanceService;
export { defaultGovernanceService as governanceService };
