// src/shared/services/reporting/templates/template.test.ts
import { describe, it, expect } from "vitest";
import { ReportTemplateRegistry } from "./ReportTemplateRegistry";
import { SectionBuilderRegistry } from "./SectionBuilderRegistry";
import { SectionBuilderProvider } from "./SectionBuilderProvider";
import { TemplateValidator } from "./TemplateValidator";
import { CompositionExecutionPlanner } from "./CompositionExecutionPlanner";
import { ReportComposer } from "./ReportComposer";
import { ReportTemplateService } from "./ReportTemplateService";
import { HookRegistry } from "./HookRegistry";
import { DocumentTransformationService } from "./DocumentTransformationService";
import { HeaderSectionBuilder } from "./builders/HeaderSectionBuilder";
import { SummarySectionBuilder } from "./builders/SummarySectionBuilder";
import { MetricsSectionBuilder } from "./builders/MetricsSectionBuilder";
import { ForecastSectionBuilder } from "./builders/ForecastSectionBuilder";
import { FooterSectionBuilder } from "./builders/FooterSectionBuilder";
import { ReportTemplate } from "./contracts/ReportTemplate";
import { Report } from "../../contracts/Report";
import { CompositionContext } from "./contracts/CompositionContext";
import { DuplicateTemplateError, TemplateNotFoundError } from "./TemplateErrors";

describe("Wave 9 Phase 8 Composition Subsystem Tests", () => {
  const mockReport: Report<any> = {
    id: "rep123",
    title: "Leads Generation Report",
    generatedAt: new Date(),
    metadata: { reportId: "rep123", createdBy: "admin", format: "csv" },
    filters: [],
    rows: [
      { timestamp: "2026-07-01T00:00:00.000Z", metric: "Active Leads", value: 100 },
      { timestamp: "2026-07-02T00:00:00.000Z", metric: "Active Leads", value: 110 },
      { timestamp: "2026-07-03T00:00:00.000Z", metric: "Active Leads", value: 120 },
    ],
  };

  const defaultBranding = {
    companyName: "Golden Acres",
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
    footerText: "Copyright 2026",
  };

  const defaultLocalization = {
    locale: "en-US",
    timezone: "UTC",
    dateFormat: "YYYY-MM-DD",
    numberFormat: "decimal",
  };

  const defaultContext: CompositionContext = {
    branding: defaultBranding,
    localization: defaultLocalization,
    generatedAt: new Date().toISOString(),
    generatedBy: "admin",
    correlationId: "corr123",
    executionId: "exec123",
  };

  const mockTemplate: ReportTemplate = {
    templateId: "exec-temp-123",
    version: "1.0.0",
    displayName: "Executive Summary Template",
    supportedReportTypes: ["leads"],
    sections: [
      { id: "h1", type: "header", enabled: true, configuration: { showMetadata: true } },
      { id: "s1", type: "summary", enabled: true, configuration: { includeAverage: true } },
      { id: "m1", type: "metrics", enabled: true, configuration: { maxRows: 10 } },
      { id: "f1", type: "forecast", enabled: true, configuration: { strategyName: "Moving Average Forecast Strategy", horizon: 2 } },
      { id: "ft1", type: "footer", enabled: true, configuration: { includeSignatureLine: true } },
    ],
  };

  describe("Registries & Dynamic Providers", () => {
    it("manages dynamic template registration and prevents duplicates", () => {
      const registry = new ReportTemplateRegistry();
      registry.register(mockTemplate);

      expect(() => registry.register(mockTemplate)).toThrow(DuplicateTemplateError);
      expect(registry.getTemplate("exec-temp-123")).toBeDefined();
      expect(() => registry.getTemplate("missing-temp")).toThrow(TemplateNotFoundError);
    });

    it("correctly resolves builders using SectionBuilderProvider", () => {
      const registry = new SectionBuilderRegistry();
      const headerBuilder = new HeaderSectionBuilder();
      registry.register("header", headerBuilder);

      const provider = new SectionBuilderProvider(registry);
      const resolved = provider.resolve("header");
      expect(resolved).toBe(headerBuilder);
      expect(() => provider.resolve("footer")).toThrow(/could not be resolved/);
    });
  });

  describe("Validation & Cycle Detection", () => {
    it("TemplateValidator detects duplicate IDs and missing builders", () => {
      const registry = new SectionBuilderRegistry();
      const provider = new SectionBuilderProvider(registry);
      const validator = new TemplateValidator(provider);

      const duplicateIdTemplate: ReportTemplate = {
        templateId: "temp-dup",
        version: "1.0.0",
        displayName: "Dup Template",
        supportedReportTypes: ["test"],
        sections: [
          { id: "sec1", type: "header", enabled: true },
          { id: "sec1", type: "footer", enabled: true },
        ],
      };

      const result = validator.validate(duplicateIdTemplate);
      expect(result.valid).toBe(false);
      expect(result.messages.some((m) => m.message.includes("Duplicate section ID"))).toBe(true);
    });

    it("detects cyclic dependency loops", () => {
      const registry = new SectionBuilderRegistry();
      const provider = new SectionBuilderProvider(registry);
      const validator = new TemplateValidator(provider);

      // Register mock builders with a circular dependency
      const cycleHeaderBuilder: any = {
        metadata: { id: "H", version: "1.0", supportedSectionTypes: ["header"], dependsOn: ["footer"] },
      };
      const cycleFooterBuilder: any = {
        metadata: { id: "F", version: "1.0", supportedSectionTypes: ["footer"], dependsOn: ["header"] },
      };
      registry.register("header", cycleHeaderBuilder);
      registry.register("footer", cycleFooterBuilder);

      const cycleTemplate: ReportTemplate = {
        templateId: "temp-cycle",
        version: "1.0.0",
        displayName: "Cycle Template",
        supportedReportTypes: ["test"],
        sections: [
          { id: "h", type: "header", enabled: true },
          { id: "f", type: "footer", enabled: true },
        ],
      };

      const result = validator.validate(cycleTemplate);
      expect(result.valid).toBe(false);
      expect(result.messages.some((m) => m.message.includes("Circular dependency"))).toBe(true);
    });
  });

  describe("Execution Planning", () => {
    it("CompositionExecutionPlanner schedules execution batches dynamically", () => {
      const builderRegistry = new SectionBuilderRegistry();
      builderRegistry.register("header", new HeaderSectionBuilder());
      builderRegistry.register("summary", new SummarySectionBuilder());
      builderRegistry.register("metrics", new MetricsSectionBuilder());
      builderRegistry.register("forecast", new ForecastSectionBuilder());
      builderRegistry.register("footer", new FooterSectionBuilder());

      const provider = new SectionBuilderProvider(builderRegistry);
      const planner = new CompositionExecutionPlanner(provider);

      const plan = planner.plan(mockTemplate);
      expect(plan.templateId).toBe("exec-temp-123");
      expect(plan.parallelGroups.length).toBeGreaterThan(0);
      
      // Verification that dependsOn rules are respected:
      // Forecast depends on Metrics. Metrics must be scheduled at a level BEFORE forecast.
      const metricsGroupIndex = plan.parallelGroups.findIndex((g) => g.some((s) => s.type === "metrics"));
      const forecastGroupIndex = plan.parallelGroups.findIndex((g) => g.some((s) => s.type === "forecast"));
      expect(metricsGroupIndex).toBeLessThan(forecastGroupIndex);
    });
  });

  describe("Composer & Lifecycle Hooks", () => {
    it("runs compose flow, executes pluggable hooks, and sorts sections deterministically", async () => {
      const builderRegistry = new SectionBuilderRegistry();
      builderRegistry.register("header", new HeaderSectionBuilder());
      builderRegistry.register("summary", new SummarySectionBuilder());
      builderRegistry.register("metrics", new MetricsSectionBuilder());
      builderRegistry.register("forecast", new ForecastSectionBuilder());
      builderRegistry.register("footer", new FooterSectionBuilder());

      const provider = new SectionBuilderProvider(builderRegistry);
      const hooks = new HookRegistry();

      let beforeCompHookRun = false;
      let afterCompHookRun = false;

      hooks.register("beforeComposition", {
        id: "hook1",
        execute: async () => { beforeCompHookRun = true; },
      });
      hooks.register("afterComposition", {
        id: "hook2",
        execute: async () => { afterCompHookRun = true; },
      });

      const composer = new ReportComposer(provider, hooks);
      const composedReport = await composer.compose(mockReport, mockTemplate, defaultContext);

      expect(beforeCompHookRun).toBe(true);
      expect(afterCompHookRun).toBe(true);

      // Verify deterministic ordering: sections should match template IDs order
      expect(composedReport.sections[0].id).toBe("h1");
      expect(composedReport.sections[composedReport.sections.length - 1].id).toBe("ft1");

      // Verify composition manifest details
      expect(composedReport.manifest.builderGraphHash).toBeDefined();
      expect(composedReport.manifest.parallelGroupCount).toBeGreaterThan(0);
      expect(composedReport.manifest.templateId).toBe(mockTemplate.templateId);

      // Immutability boundaries
      expect(Object.isFrozen(composedReport)).toBe(true);
      expect(Object.isFrozen(composedReport.sections)).toBe(true);
    });

    it("respects cancellation token mid-execution", async () => {
      const builderRegistry = new SectionBuilderRegistry();
      builderRegistry.register("header", new HeaderSectionBuilder());
      builderRegistry.register("summary", new SummarySectionBuilder());

      const provider = new SectionBuilderProvider(builderRegistry);
      const hooks = new HookRegistry();
      const composer = new ReportComposer(provider, hooks);

      const cancelledContext: CompositionContext = {
        ...defaultContext,
        cancellationToken: { isCancelled: true },
      };

      const smallTemplate: ReportTemplate = {
        templateId: "temp-cancel",
        version: "1.0.0",
        displayName: "Cancel Template",
        supportedReportTypes: ["test"],
        sections: [
          { id: "h", type: "header", enabled: true },
          { id: "s", type: "summary", enabled: true },
        ],
      };

      await expect(composer.compose(mockReport, smallTemplate, cancelledContext)).rejects.toThrow(
        /Composition was cancelled/
      );
    });
  });

  describe("One-way Transformation Service", () => {
    it("transforms ComposedReport to RenderableDocument cleanly", async () => {
      const service = new ReportTemplateService();
      service.getTemplateRegistry().register(mockTemplate);

      const composed = await service.composeReport(mockReport, mockTemplate.templateId, defaultContext);
      const transformer = new DocumentTransformationService();
      const document = transformer.transform(composed);

      expect(document.id).toBe(composed.id);
      expect(document.branding.companyName).toBe("Golden Acres");
      expect(document.sections.length).toBe(composed.sections.length);
      expect(Object.isFrozen(document)).toBe(true);
    });
  });
});
