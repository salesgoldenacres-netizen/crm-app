import polygonClipping from "polygon-clipping";
import {
  extractRingsFromClippingResult,
  toClippingMultiPolygon,
  type SvgPoint,
  type SvgRing,
} from "./adminMapGeometry";

export type RoadSubtractPlot = {
  id: string;
  points: SvgRing;
};

export type RoadSubtractResult = {
  id: string;
  /** Zero or more rings remaining after difference (may split a plot). */
  rings: SvgRing[];
};

/**
 * Build a closed corridor polygon around a centerline.
 * `widthFt` is real-world width; `scaleRatio` is ft per SVG unit.
 */
export function roadCorridorPolygon(
  centerline: SvgPoint[],
  widthFt: number,
  scaleRatio: number
): SvgRing {
  if (!centerline || centerline.length < 2) return [];
  if (!(widthFt > 0) || !(scaleRatio > 0)) return [];

  const halfW = widthFt / (2 * scaleRatio);
  const left: SvgPoint[] = [];
  const right: SvgPoint[] = [];

  for (let i = 0; i < centerline.length; i++) {
    const prev = centerline[Math.max(0, i - 1)];
    const curr = centerline[i];
    const next = centerline[Math.min(centerline.length - 1, i + 1)];

    let dx: number;
    let dy: number;
    if (i === 0) {
      dx = next[0] - curr[0];
      dy = next[1] - curr[1];
    } else if (i === centerline.length - 1) {
      dx = curr[0] - prev[0];
      dy = curr[1] - prev[1];
    } else {
      dx = next[0] - prev[0];
      dy = next[1] - prev[1];
    }

    const len = Math.hypot(dx, dy);
    if (len < 1e-9) {
      left.push([curr[0], curr[1] - halfW]);
      right.push([curr[0], curr[1] + halfW]);
      continue;
    }

    const nx = (-dy / len) * halfW;
    const ny = (dx / len) * halfW;
    left.push([curr[0] + nx, curr[1] + ny]);
    right.push([curr[0] - nx, curr[1] - ny]);
  }

  return [...left, ...right.reverse()];
}

/** Subtract a road ring from each plot; returns remaining ring(s) per plot. */
export function subtractRoadFromPlots(
  plots: RoadSubtractPlot[],
  roadRing: SvgRing
): RoadSubtractResult[] {
  if (!roadRing || roadRing.length < 3) {
    return plots.map((p) => ({ id: p.id, rings: p.points?.length ? [p.points] : [] }));
  }

  const roadGeom = toClippingMultiPolygon(roadRing);

  return plots.map((plot) => {
    if (!plot.points || plot.points.length < 3) {
      return { id: plot.id, rings: [] };
    }
    try {
      const diff = polygonClipping.difference(
        toClippingMultiPolygon(plot.points),
        roadGeom
      );
      return { id: plot.id, rings: extractRingsFromClippingResult(diff) };
    } catch {
      return { id: plot.id, rings: [plot.points] };
    }
  });
}
