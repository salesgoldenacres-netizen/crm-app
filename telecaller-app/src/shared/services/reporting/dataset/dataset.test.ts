// src/shared/services/reporting/dataset/dataset.test.ts
import { describe, it, expect } from "vitest";
import { DatasetProviderRegistry } from "./DatasetProviderRegistry";
import { DatasetProviderResolver } from "./DatasetProviderResolver";
import { DatasetExecutionPlanner } from "./DatasetExecutionPlanner";
import { DatasetService } from "./DatasetService";
import { SalesSummaryDatasetKey, SalesSummaryDatasetProvider } from "./providers/SalesSummaryDatasetProvider";
import { LeadConversionDatasetKey, LeadConversionDatasetProvider } from "./providers/LeadConversionDatasetProvider";
import { Report } from "../../contracts/Report";
import { DatasetContext } from "./contracts/DatasetContext";
import { DatasetValidationError, ProviderNotFoundError } from "./DatasetErrors";

describe("Wave 9 Phase 9 Dataset Engine Subsystem Tests", () => {
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

  const defaultContext: DatasetContext = {
    reportParameters: {},
    localization: {
      locale: "en-US",
      timezone: "UTC",
      dateFormat: "YYYY-MM-DD",
      numberFormat: "decimal",
    },
    executionId: "exec123",
    correlationId: "corr123",
    generatedBy: "admin",
  };

  describe("Registries & Dynamic Resolvers", () => {
    it("handles registration and throws on duplicate keys", () => {
      const registry = new DatasetProviderRegistry();
      const provider = new SalesSummaryDatasetProvider();
      registry.register(SalesSummaryDatasetKey, provider);

      expect(() => registry.register(SalesSummaryDatasetKey, provider)).toThrow();
      expect(registry.getProvider(SalesSummaryDatasetKey)).toBe(provider);
    });

    it("throws ProviderNotFoundError when resolving missing keys", () => {
      const registry = new DatasetProviderRegistry();
      const resolver = new DatasetProviderResolver(registry);

      expect(() => resolver.resolve(SalesSummaryDatasetKey)).toThrow(ProviderNotFoundError);
    });
  });

  describe("Planning & Cycle Detection", () => {
    it("plans topological batches and detects circular dependencies", () => {
      const registry = new DatasetProviderRegistry();
      const resolver = new DatasetProviderResolver(registry);
      const planner = new DatasetExecutionPlanner(resolver);

      // Create a circular dependency
      const cycleKeyA = { id: "key-a" };
      const cycleKeyB = { id: "key-b" };

      const providerA: any = {
        metadata: {
          id: "A",
          version: "1.0",
          displayName: "A",
          outputKey: cycleKeyA,
          dependsOn: [cycleKeyB],
        },
      };
      const providerB: any = {
        metadata: {
          id: "B",
          version: "1.0",
          displayName: "B",
          outputKey: cycleKeyB,
          dependsOn: [cycleKeyA],
        },
      };

      registry.register(cycleKeyA, providerA);
      registry.register(cycleKeyB, providerB);

      expect(() => planner.plan([cycleKeyA, cycleKeyB])).toThrow(DatasetValidationError);
    });

    it("orders parallel groups correctly based on dependsOn mapping", () => {
      const registry = new DatasetProviderRegistry();
      registry.register(SalesSummaryDatasetKey, new SalesSummaryDatasetProvider());
      registry.register(LeadConversionDatasetKey, new LeadConversionDatasetProvider());

      const resolver = new DatasetProviderResolver(registry);
      const planner = new DatasetExecutionPlanner(resolver);

      const plan = planner.plan([LeadConversionDatasetKey, SalesSummaryDatasetKey]);
      expect(plan.parallelGroups.length).toBe(2);
      
      // SalesSummary must execute in group 0 because LeadConversion depends on it
      expect(plan.parallelGroups[0][0].id).toBe(SalesSummaryDatasetKey.id);
      expect(plan.parallelGroups[1][0].id).toBe(LeadConversionDatasetKey.id);
    });
  });

  describe("DatasetService & Manifest Aggregation", () => {
    it("generates ReportDataset with correct metadata and deep-freeze contracts", async () => {
      const service = new DatasetService();
      const dataset = await service.generate(
        mockReport,
        [SalesSummaryDatasetKey, LeadConversionDatasetKey],
        defaultContext
      );

      // Verify manifest timings and execution hashes
      expect(dataset.manifest.executionId).toBe("exec123");
      expect(dataset.manifest.providerCount).toBe(2);
      expect(dataset.manifest.builderGraphHash).toBeDefined();

      // Retrieve strongly typed SalesSummary using Key
      const sales = dataset.get(SalesSummaryDatasetKey);
      expect(sales.totalSalesCount).toBe(3);
      expect(sales.aggregateRevenue).toBe(330);
      expect(sales.averageOrderValue).toBe(110);

      // Check boundary immutability
      expect(Object.isFrozen(dataset)).toBe(true);
      expect(Object.isFrozen(sales)).toBe(true);
    });

    it("throws on tryGet/get errors if key is missing or invalid", async () => {
      const service = new DatasetService();
      const dataset = await service.generate(mockReport, [SalesSummaryDatasetKey], defaultContext);

      expect(dataset.tryGet(LeadConversionDatasetKey)).toBeUndefined();
      expect(() => dataset.get(LeadConversionDatasetKey)).toThrow(/was not found in dataset/);
    });

    it("respects cancellation token", async () => {
      const service = new DatasetService();
      const context: DatasetContext = {
        ...defaultContext,
        cancellationToken: { isCancelled: true },
      };

      await expect(
        service.generate(mockReport, [SalesSummaryDatasetKey], context)
      ).rejects.toThrow(/generation was cancelled/);
    });
  });

  describe("Middleware Pipeline Interceptors", () => {
    it("calls middleware chain sequentially before executing providers", async () => {
      const service = new DatasetService();
      let middlewareRun = false;

      const mockMiddleware: DatasetMiddleware = {
        id: "mock-mid",
        execute: async (ctx, next) => {
          middlewareRun = true;
          return next();
        },
      };

      service.getPipeline().use(mockMiddleware);

      await service.generate(mockReport, [SalesSummaryDatasetKey], defaultContext);
      expect(middlewareRun).toBe(true);
    });
  });
});
