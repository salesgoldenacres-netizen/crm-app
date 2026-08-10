import { describe, expect, it } from "vitest";
import type { Plot } from "@/shared/types";
import {
  applyRateToAvailablePlots,
  estimatePricingSandbox,
  formatCurrencyInr,
  sumPlotAreasSqFt,
} from "./adminMapPricing";

const plots: Plot[] = [
  {
    id: "a",
    number: "1",
    size: "1000",
    rate: "100",
    price: "100000",
    status: "available",
  },
  {
    id: "b",
    number: "2",
    size: "2000",
    rate: "100",
    price: "200000",
    status: "sold",
  },
  {
    id: "r",
    number: "R",
    size: "500",
    rate: "",
    price: "",
    status: "road",
  },
];

describe("sumPlotAreasSqFt", () => {
  it("sums sellable vs total using size strings", () => {
    expect(sumPlotAreasSqFt(plots)).toEqual({
      sellable: 3000,
      total: 3500,
    });
  });
});

describe("estimatePricingSandbox", () => {
  it("computes sellable area, revenue, and percent vs project total", () => {
    const est = estimatePricingSandbox(plots, {
      lotCount: 10,
      avgSizeSqFt: 100,
      ratePerSqFt: 50,
    });
    expect(est.sellableAreaSqFt).toBe(1000);
    expect(est.revenue).toBe(50000);
    expect(est.sellableAreaPct).toBeCloseTo((1000 / 3500) * 100);
  });
});

describe("applyRateToAvailablePlots", () => {
  it("updates rate and price only on available plots with size", () => {
    const next = applyRateToAvailablePlots(plots, 200);
    expect(next[0].rate).toBe("200");
    expect(next[0].price).toBe("200000");
    expect(next[1].rate).toBe("100");
    expect(next[2].rate).toBe("");
  });
});

describe("formatCurrencyInr", () => {
  it("formats rounded INR amounts", () => {
    expect(formatCurrencyInr(12345.6)).toMatch(/₹/);
  });
});
