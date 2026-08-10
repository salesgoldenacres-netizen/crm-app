import type { Plot } from "@/shared/types";

const NON_SELLABLE = new Set(["road", "park", "market"]);

export type PricingSandboxInput = {
  lotCount: number;
  avgSizeSqFt: number;
  ratePerSqFt: number;
};

export type PricingSandboxEstimate = {
  sellableAreaSqFt: number;
  revenue: number;
  /** Null when total area cannot be determined from project plots. */
  sellableAreaPct: number | null;
  existingSellableAreaSqFt: number;
  existingTotalAreaSqFt: number;
};

function parseSize(size: string | undefined): number {
  if (!size) return 0;
  const n = parseFloat(String(size).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function isSellableStatus(status: string | undefined): boolean {
  return !NON_SELLABLE.has(String(status || "").toLowerCase());
}

/** Sum plot.size for sellable vs all plots (uses stored size strings). */
export function sumPlotAreasSqFt(plots: Plot[]): {
  sellable: number;
  total: number;
} {
  let sellable = 0;
  let total = 0;
  for (const plot of plots || []) {
    const area = parseSize(plot.size);
    total += area;
    if (isSellableStatus(plot.status)) sellable += area;
  }
  return { sellable, total };
}

/** What-if estimates from sandbox inputs vs existing plot sizes. */
export function estimatePricingSandbox(
  plots: Plot[],
  input: PricingSandboxInput
): PricingSandboxEstimate {
  const lotCount = Math.max(0, Number(input.lotCount) || 0);
  const avgSizeSqFt = Math.max(0, Number(input.avgSizeSqFt) || 0);
  const ratePerSqFt = Math.max(0, Number(input.ratePerSqFt) || 0);

  const sellableAreaSqFt = lotCount * avgSizeSqFt;
  const revenue = sellableAreaSqFt * ratePerSqFt;
  const { sellable: existingSellableAreaSqFt, total: existingTotalAreaSqFt } =
    sumPlotAreasSqFt(plots);

  const denom = existingTotalAreaSqFt > 0 ? existingTotalAreaSqFt : sellableAreaSqFt;
  const sellableAreaPct =
    denom > 0 ? (sellableAreaSqFt / denom) * 100 : null;

  return {
    sellableAreaSqFt,
    revenue,
    sellableAreaPct,
    existingSellableAreaSqFt,
    existingTotalAreaSqFt,
  };
}

/**
 * Apply rate to available plots; recompute price from size × rate when size is numeric.
 * Plots without a usable size keep existing price and only get the new rate.
 */
export function applyRateToAvailablePlots(
  plots: Plot[],
  ratePerSqFt: number
): Plot[] {
  const rate = Math.max(0, Number(ratePerSqFt) || 0);
  const rateStr = String(rate);
  return (plots || []).map((plot) => {
    if (String(plot.status).toLowerCase() !== "available") return plot;
    const size = parseSize(plot.size);
    if (size > 0) {
      return {
        ...plot,
        rate: rateStr,
        price: String(Math.round(size * rate)),
      };
    }
    return { ...plot, rate: rateStr };
  });
}

export function formatCurrencyInr(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}
