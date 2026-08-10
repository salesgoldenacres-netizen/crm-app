import type { Plot, PlotLabelContentMode } from "@/shared/types";
import { svgPolygonArea, type SvgRing } from "./adminMapGeometry";

const COMPASS_BUCKETS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

/** Per-edge lengths in feet (same order as consecutive vertex pairs). */
export function edgeLengthsFt(points: SvgRing, scaleRatio: number): number[] {
  if (!points?.length || !Number.isFinite(scaleRatio)) return [];
  const n = points.length;
  const lengths: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    lengths.push(Math.hypot(b[0] - a[0], b[1] - a[1]) * scaleRatio);
  }
  return lengths;
}

/** Polygon area in sq ft (shoelace × scaleRatio²). */
export function areaSqFt(points: SvgRing, scaleRatio: number): number {
  if (!Number.isFinite(scaleRatio)) return 0;
  return svgPolygonArea(points) * scaleRatio * scaleRatio;
}

export function perimeterFt(points: SvgRing, scaleRatio: number): number {
  return edgeLengthsFt(points, scaleRatio).reduce((sum, len) => sum + len, 0);
}

/**
 * Longest-edge facing bucket for SVG Y-down maps (up = North).
 * Returns "" when no usable edge exists.
 */
export function facingHint(points: SvgRing): string {
  if (!points || points.length < 2) return "";
  const n = points.length;
  let bestLen = -1;
  let bestDx = 0;
  let bestDy = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len > bestLen) {
      bestLen = len;
      bestDx = dx;
      bestDy = dy;
    }
  }
  if (bestLen < 1e-9) return "";

  // 0° = North (screen up), clockwise through E/S/W.
  let deg = (Math.atan2(bestDx, -bestDy) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  const idx = Math.round(deg / 45) % 8;
  return COMPASS_BUCKETS[idx];
}

function formatAreaLabel(sqFt: number): string {
  if (!Number.isFinite(sqFt) || sqFt <= 0) return "";
  return `${Math.round(sqFt)} sq ft`;
}

/** Build a plot label string for the given content mode. */
export function formatPlotLabel(
  plot: Pick<Plot, "number" | "size">,
  points: SvgRing,
  scaleRatio: number,
  mode: PlotLabelContentMode
): string {
  const number = plot.number?.trim() || "";
  if (mode === "number") return number;

  const area =
    Number.isFinite(scaleRatio) && scaleRatio > 0
      ? formatAreaLabel(areaSqFt(points, scaleRatio))
      : plot.size?.trim()
        ? `${plot.size.trim()} sq ft`
        : "";

  if (mode === "number+area") {
    return [number, area].filter(Boolean).join("\n");
  }

  const facing = facingHint(points);
  const facingPart = facing ? `Facing ${facing}` : "";
  return [number, area, facingPart].filter(Boolean).join("\n");
}
