// src/shared/services/reporting/governance/definition-lifecycle.test.ts
import { describe, it, expect } from "vitest";
import { DefinitionVersion } from "./contracts/DefinitionVersion";
import { VersionConstraint } from "./contracts/VersionConstraint";
import { DefinitionIdentity } from "./contracts/DefinitionIdentity";
import { DefinitionDescriptor } from "./contracts/DefinitionDescriptor";
import { MigrationDefinition } from "./contracts/MigrationDefinition";
import { DefinitionRegistry } from "./DefinitionRegistry";
import { DefinitionResolver } from "./DefinitionResolver";
import { VersionConstraintEvaluator } from "./VersionConstraintEvaluator";
import { DefinitionValidator } from "./DefinitionValidator";
import { CompatibilityAnalyzer } from "./CompatibilityAnalyzer";
import { MigrationPlanner } from "./MigrationPlanner";
import { MigrationPipeline } from "./MigrationPipeline";
import { GovernanceService } from "./GovernanceService";
import { DuplicateDefinitionError, InvalidLifecycleTransitionError, MigrationPathNotFoundError } from "./GovernanceErrors";

describe("Wave 9 Phase 10 Governance Subsystem Tests", () => {
  describe("DefinitionVersion SemVer parsing & comparison", () => {
    it("parses valid versions and throws on malformed version inputs", () => {
      const v1 = DefinitionVersion.parse("1.2.3");
      const v2 = DefinitionVersion.parse("v2.0.0");

      expect(v1.major).toBe(1);
      expect(v1.minor).toBe(2);
      expect(v1.patch).toBe(3);
      expect(v2.major).toBe(2);

      expect(() => DefinitionVersion.parse("1.0")).toThrow(/Invalid semantic version string/);
      expect(() => DefinitionVersion.parse("a.b.c")).toThrow(/Invalid semantic version digits/);
    });

    it("compares semantic versions correctly", () => {
      const v100 = DefinitionVersion.parse("1.0.0");
      const v101 = DefinitionVersion.parse("1.0.1");
      const v110 = DefinitionVersion.parse("1.1.0");
      const v200 = DefinitionVersion.parse("2.0.0");

      expect(v100.compare(v101)).toBe(-1);
      expect(v110.compare(v101)).toBe(1);
      expect(v200.compare(v100)).toBe(1);
      expect(v100.equals(DefinitionVersion.parse("1.0.0"))).toBe(true);

      expect(v100.isBefore(v101)).toBe(true);
      expect(v110.isAfter(v101)).toBe(true);
      expect(v100.isCompatibleMajor(v101)).toBe(true);
      expect(v100.isCompatibleMajor(v200)).toBe(false);
    });
  });

  describe("VersionConstraint & Evaluator", () => {
    const evaluator = new VersionConstraintEvaluator();

    it("parses operators and evaluates range matches", () => {
      const v120 = DefinitionVersion.parse("1.2.0");

      const eq = VersionConstraint.parse("=1.2.0");
      const gt = VersionConstraint.parse(">1.1.0");
      const gte = VersionConstraint.parse(">=1.2.0");
      const lt = VersionConstraint.parse("<2.0.0");
      const caret = VersionConstraint.parse("^1.0.0");
      const tilde = VersionConstraint.parse("~1.2.0");

      expect(evaluator.evaluate(v120, eq)).toBe(true);
      expect(evaluator.evaluate(v120, gt)).toBe(true);
      expect(evaluator.evaluate(v120, gte)).toBe(true);
      expect(evaluator.evaluate(v120, lt)).toBe(true);
      expect(evaluator.evaluate(v120, caret)).toBe(true);
      expect(evaluator.evaluate(v120, tilde)).toBe(true);

      const invalidTilde = VersionConstraint.parse("~1.3.0");
      expect(evaluator.evaluate(v120, invalidTilde)).toBe(false);
    });
  });

  describe("DefinitionRegistry & Validator", () => {
    const mockIdentity: DefinitionIdentity = {
      id: "sales-template",
      type: "template",
      namespace: "core",
    };

    const mockDescriptor: DefinitionDescriptor = {
      identity: mockIdentity,
      semanticVersion: DefinitionVersion.parse("1.0.0"),
      lifecycleState: "Experimental",
      checksum: "abc123checksum",
      dependencies: [],
      minimumEngineVersion: VersionConstraint.parse(">=1.0.0"),
    };

    it("registers descriptors and prevents duplicates", () => {
      const registry = new DefinitionRegistry();
      registry.register(mockDescriptor);

      expect(() => registry.register(mockDescriptor)).toThrow(DuplicateDefinitionError);
      expect(registry.getDescriptor("sales-template", "1.0.0")).toBeDefined();
    });

    it("validates lifecycle state transitions", () => {
      const validator = new DefinitionValidator();

      // Forward progression is allowed
      expect(() => validator.validateLifecycleTransition("Experimental", "Active")).not.toThrow();
      expect(() => validator.validateLifecycleTransition("Active", "Deprecated")).not.toThrow();
      expect(() => validator.validateLifecycleTransition("Deprecated", "Removed")).not.toThrow();

      // Rollback transitions are blocked
      expect(() => validator.validateLifecycleTransition("Active", "Experimental")).toThrow(
        InvalidLifecycleTransitionError
      );
      expect(() => validator.validateLifecycleTransition("Sunset", "Active")).toThrow(
        InvalidLifecycleTransitionError
      );
    });
  });

  describe("Compatibility Analysis & Resolution", () => {
    it("analyzes engine compatibility and dependency constraints", () => {
      const registry = new DefinitionRegistry();
      const evaluator = new VersionConstraintEvaluator();
      const analyzer = new CompatibilityAnalyzer(registry, evaluator);

      const depIdentity: DefinitionIdentity = {
        id: "math-plugin",
        type: "plugin",
        namespace: "plugins",
      };

      const depDescriptor: DefinitionDescriptor = {
        identity: depIdentity,
        semanticVersion: DefinitionVersion.parse("1.0.0"),
        lifecycleState: "Active",
        checksum: "depchecksum",
        dependencies: [],
        minimumEngineVersion: VersionConstraint.parse(">=1.0.0"),
      };

      // Register dependency first
      registry.register(depDescriptor);

      const targetDescriptor: DefinitionDescriptor = {
        identity: { id: "main-report", type: "template", namespace: "core" },
        semanticVersion: DefinitionVersion.parse("1.0.0"),
        lifecycleState: "Active",
        checksum: "mainchecksum",
        dependencies: [
          {
            identityId: "math-plugin",
            constraint: VersionConstraint.parse("^1.0.0"),
          },
        ],
        minimumEngineVersion: VersionConstraint.parse(">=2.0.0"), // Needs v2.0.0 engine
      };

      // Engine v1.0.0 should be incompatible with main-report
      const report = analyzer.analyze(targetDescriptor, DefinitionVersion.parse("1.0.0"));
      expect(report.isCompatible).toBe(false);
      expect(report.compatibilityLevel).toBe("incompatible");
      expect(report.errors.some((e) => e.includes("requires engine version satisfying"))).toBe(true);
    });

    it("DefinitionResolver resolves the highest compatible active version", () => {
      const registry = new DefinitionRegistry();
      const evaluator = new VersionConstraintEvaluator();
      const resolver = new DefinitionResolver(registry, evaluator);

      const identity: DefinitionIdentity = { id: "leads-feed", type: "dataset-provider", namespace: "data" };

      const v1 = {
        identity,
        semanticVersion: DefinitionVersion.parse("1.0.0"),
        lifecycleState: "Active" as const,
        checksum: "v1chk",
        dependencies: [],
        minimumEngineVersion: VersionConstraint.parse(">=1.0.0"),
      };

      const v2 = {
        identity,
        semanticVersion: DefinitionVersion.parse("2.0.0"),
        lifecycleState: "Active" as const,
        checksum: "v2chk",
        dependencies: [],
        minimumEngineVersion: VersionConstraint.parse(">=2.0.0"),
      };

      const v3Removed = {
        identity,
        semanticVersion: DefinitionVersion.parse("3.0.0"),
        lifecycleState: "Removed" as const,
        checksum: "v3chk",
        dependencies: [],
        minimumEngineVersion: VersionConstraint.parse(">=1.0.0"),
      };

      registry.register(v1);
      registry.register(v2);
      registry.register(v3Removed);

      // On engine v1.5.0: only v1 is resolved (v2 requires >=2.0.0, v3 is Removed)
      const resolved1 = resolver.resolveActive("leads-feed", DefinitionVersion.parse("1.5.0"));
      expect(resolved1?.semanticVersion.rawString).toBe("1.0.0");

      // On engine v2.5.0: v2 is resolved as it is highest compatible active version
      const resolved2 = resolver.resolveActive("leads-feed", DefinitionVersion.parse("2.5.0"));
      expect(resolved2?.semanticVersion.rawString).toBe("2.0.0");
    });
  });

  describe("Migration Planning & Pipeline", () => {
    it("plans a valid multi-step migration path and executes it deterministically", async () => {
      const planner = new MigrationPlanner();
      const pipeline = new MigrationPipeline();

      const identityId = "leads-template";

      const step1: MigrationDefinition = {
        migrationId: "mig-v1-to-v2",
        identityId,
        sourceVersion: DefinitionVersion.parse("1.0.0"),
        targetVersion: DefinitionVersion.parse("2.0.0"),
        description: "Migrates headers fields structure",
      };

      const step2: MigrationDefinition = {
        migrationId: "mig-v2-to-v3",
        identityId,
        sourceVersion: DefinitionVersion.parse("2.0.0"),
        targetVersion: DefinitionVersion.parse("3.0.0"),
        description: "Enriches analytics metric aggregations",
      };

      planner.registerMigration(step1);
      planner.registerMigration(step2);

      const plan = planner.plan(
        identityId,
        DefinitionVersion.parse("1.0.0"),
        DefinitionVersion.parse("3.0.0")
      );

      expect(plan.valid).toBe(true);
      expect(plan.orderedMigrations.length).toBe(2);
      expect(plan.orderedMigrations[0].migrationId).toBe("mig-v1-to-v2");

      const result = await pipeline.execute(plan);
      expect(result.success).toBe(true);
      expect(result.executedMigrations).toContain("mig-v1-to-v2");
      expect(result.executedMigrations).toContain("mig-v2-to-v3");
      expect(result.finalVersion.rawString).toBe("3.0.0");
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("throws on missing migration paths", () => {
      const planner = new MigrationPlanner();
      expect(() =>
        planner.plan("leads-template", DefinitionVersion.parse("1.0.0"), DefinitionVersion.parse("2.0.0"))
      ).toThrow(MigrationPathNotFoundError);
    });
  });

  describe("GovernanceService facade orchestrator", () => {
    it("provides clean facade access across governance tasks", async () => {
      const service = new GovernanceService();
      
      const identity: DefinitionIdentity = { id: "leads", type: "template", namespace: "core" };
      const desc: DefinitionDescriptor = {
        identity,
        semanticVersion: DefinitionVersion.parse("1.0.0"),
        lifecycleState: "Active",
        checksum: "sumsum",
        dependencies: [],
        minimumEngineVersion: VersionConstraint.parse(">=1.0.0"),
      };

      service.registerDefinition(desc);
      const retrieved = service.resolveActiveDefinition("leads", DefinitionVersion.parse("1.2.0"));
      expect(retrieved).toBeDefined();

      const report = service.analyzeCompatibility(desc, DefinitionVersion.parse("1.5.0"));
      expect(report.isCompatible).toBe(true);
    });
  });
});
