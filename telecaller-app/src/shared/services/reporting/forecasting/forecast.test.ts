// src/shared/services/reporting/forecasting/forecast.test.ts
import { describe, it, expect } from "vitest";
import { MetricSeriesExtractor } from "./MetricSeriesExtractor";
import { ForecastStrategyRegistry } from "./ForecastStrategyRegistry";
import { MovingAverageForecastStrategy } from "./strategies/MovingAverageForecastStrategy";
import { LinearTrendForecastStrategy } from "./strategies/LinearTrendForecastStrategy";
import { ForecastService } from "./ForecastService";
import { ForecastValidationError, ForecastStrategyNotFoundError } from "./ForecastErrors";
import { Report } from "../contracts/Report";

describe("Wave 9 Phase 7 Forecasting Subsystem Tests", () => {
  const mockReport: Report<any> = {
    id: "rep123",
    title: "Monthly Leads Performance",
    generatedAt: new Date(),
    metadata: { reportId: "rep123", createdBy: "admin", format: "csv" },
    filters: [],
    rows: [
      { timestamp: "2026-07-01T00:00:00.000Z", metric: "Active Leads", value: 100, unit: "count", source: "test" },
      { timestamp: "2026-07-02T00:00:00.000Z", metric: "Active Leads", value: 110, unit: "count", source: "test" },
      { timestamp: "2026-07-03T00:00:00.000Z", metric: "Active Leads", value: 120, unit: "count", source: "test" },
    ],
  };

  describe("MetricSeriesExtractor & Validations", () => {
    it("groups rows by metric, sorts observations chronologically, and resolves metadata", () => {
      const unsortedReport: Report<any> = {
        ...mockReport,
        rows: [
          { timestamp: "2026-07-03T00:00:00.000Z", metric: "Active Leads", value: 120 },
          { timestamp: "2026-07-01T00:00:00.000Z", metric: "Active Leads", value: 100 },
          { timestamp: "2026-07-02T00:00:00.000Z", metric: "Active Leads", value: 110 },
        ],
      };

      const extractor = new MetricSeriesExtractor();
      const series = extractor.extract(unsortedReport);

      expect(series.length).toBe(1);
      expect(series[0].metricName).toBe("Active Leads");
      expect(series[0].observations.length).toBe(3);
      // Chronological sort verification
      expect(series[0].observations[0].timestamp).toBe("2026-07-01T00:00:00.000Z");
      expect(series[0].observations[2].timestamp).toBe("2026-07-03T00:00:00.000Z");
    });

    it("throws ForecastValidationError on invalid row types or empty metric names", () => {
      const extractor = new MetricSeriesExtractor();
      const invalidReport: Report<any> = {
        ...mockReport,
        rows: [{ timestamp: "2026-07-01T00:00:00.000Z", metric: "", value: 100 }],
      };
      expect(() => extractor.extract(invalidReport)).toThrow(ForecastValidationError);
    });

    it("throws ForecastValidationError on unparseable dates", () => {
      const extractor = new MetricSeriesExtractor();
      const invalidReport: Report<any> = {
        ...mockReport,
        rows: [{ timestamp: "not-a-date", metric: "Active Leads", value: 100 }],
      };
      expect(() => extractor.extract(invalidReport)).toThrow(ForecastValidationError);
    });

    it("throws ForecastValidationError on NaN/Infinity value inputs", () => {
      const extractor = new MetricSeriesExtractor();
      const nanReport: Report<any> = {
        ...mockReport,
        rows: [{ timestamp: "2026-07-01T00:00:00.000Z", metric: "Active Leads", value: NaN }],
      };
      expect(() => extractor.extract(nanReport)).toThrow(ForecastValidationError);

      const infReport: Report<any> = {
        ...mockReport,
        rows: [{ timestamp: "2026-07-01T00:00:00.000Z", metric: "Active Leads", value: Infinity }],
      };
      expect(() => extractor.extract(infReport)).toThrow(ForecastValidationError);
    });

    it("throws ForecastValidationError on duplicate timestamps for the same metric", () => {
      const extractor = new MetricSeriesExtractor();
      const duplicateReport: Report<any> = {
        ...mockReport,
        rows: [
          { timestamp: "2026-07-01T00:00:00.000Z", metric: "Active Leads", value: 100 },
          { timestamp: "2026-07-01T00:00:00.000Z", metric: "Active Leads", value: 110 },
        ],
      };
      expect(() => extractor.extract(duplicateReport)).toThrow(ForecastValidationError);
    });

    it("supports missing values (null observations) in observations list", () => {
      const extractor = new MetricSeriesExtractor();
      const nullValueReport: Report<any> = {
        ...mockReport,
        rows: [
          { timestamp: "2026-07-01T00:00:00.000Z", metric: "Active Leads", value: 100 },
          { timestamp: "2026-07-02T00:00:00.000Z", metric: "Active Leads", value: null },
        ],
      };
      const series = extractor.extract(nullValueReport);
      expect(series[0].observations[1].value).toBeNull();
    });
  });

  describe("ForecastStrategyRegistry", () => {
    it("throws duplicate registration errors for already registered strategy types", () => {
      const registry = new ForecastStrategyRegistry();
      const strategy = new MovingAverageForecastStrategy();
      registry.register(strategy);
      expect(() => registry.register(strategy)).toThrow(/already registered/);
    });

    it("throws ForecastStrategyNotFoundError when resolving non-registered strategies", () => {
      const registry = new ForecastStrategyRegistry();
      expect(() => registry.getStrategy("ARIMA")).toThrow(ForecastStrategyNotFoundError);
    });
  });

  describe("MovingAverageForecastStrategy", () => {
    it("correctly calculates average of last N observations and computes CV confidence", async () => {
      const strategy = new MovingAverageForecastStrategy();
      const extractor = new MetricSeriesExtractor();
      const series = extractor.extract(mockReport);

      const request = {
        series,
        period: "daily" as const,
        horizon: 1,
        configuration: { windowSize: 3, minimumObservations: 3 },
      };

      const result = await strategy.forecast(request);
      expect(result.metrics.length).toBe(1);
      
      const metric = result.metrics[0];
      expect(metric.name).toBe("Active Leads");
      expect(metric.historicalValue).toBe(120);
      // Mean of [100, 110, 120] is 110
      expect(metric.predictedValue).toBe(110);
      expect(metric.confidence).toBeLessThan(1.0);
      expect(metric.trend).toBe("down"); // 110 < 120
    });

    it("handles multi-step horizon calculations recursively", async () => {
      const strategy = new MovingAverageForecastStrategy();
      const extractor = new MetricSeriesExtractor();
      const series = extractor.extract(mockReport);

      const request = {
        series,
        period: "daily" as const,
        horizon: 2, // 2 steps prediction
        configuration: { windowSize: 2, minimumObservations: 2 },
      };

      const result = await strategy.forecast(request);
      const metric = result.metrics[0];
      // Step 1 window: [110, 120] -> mean = 115
      // Step 2 window: [120, 115] -> mean = 117.5
      expect(metric.predictedValue).toBe(117.5);
    });
  });

  describe("LinearTrendForecastStrategy", () => {
    it("fits a least-squares trendline, estimates future value, and determines correct trend direction", async () => {
      const strategy = new LinearTrendForecastStrategy();
      const extractor = new MetricSeriesExtractor();
      const series = extractor.extract(mockReport);

      const request = {
        series,
        period: "daily" as const,
        horizon: 1,
        configuration: { minimumObservations: 3 },
      };

      const result = await strategy.forecast(request);
      const metric = result.metrics[0];
      expect(metric.name).toBe("Active Leads");
      // y = 10x + 100
      // N = 3 (x: 0, 1, 2) (y: 100, 110, 120)
      // prediction at index N = 3 is 130
      expect(metric.predictedValue).toBeCloseTo(130);
      expect(metric.confidence).toBeCloseTo(1.0); // Perfect linear correlation R^2 = 1.0
      expect(metric.trend).toBe("up");
    });
  });

  describe("ForecastEngine & Service Integration", () => {
    it("coordinates workflow and records execution timing metrics", async () => {
      const service = new ForecastService();
      const result = await service.forecastReport(
        mockReport,
        "Moving Average Forecast Strategy",
        "monthly",
        1
      );

      expect(result.strategy).toBe("Moving Average Forecast Strategy");
      expect(result.executionDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics[0].predictedValue).toBe(110);
    });
  });
});
