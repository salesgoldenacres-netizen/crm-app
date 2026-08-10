import type { Plot } from "@/shared/types";
import type { SvgPoint, SvgRing } from "./adminMapGeometry";

export const SOFT_LOCKED_STATUSES = new Set(["sold", "booked", "reserved"]);

export function isSoftLockedStatus(status: string | undefined): boolean {
  return SOFT_LOCKED_STATUSES.has(String(status || "").toLowerCase());
}

export const SNAP_TOLERANCE_SVG = 0.5;

export function distSq(a: SvgPoint, b: SvgPoint): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

/** Closest point on segment AB to P. */
export function closestPointOnSegment(
  p: SvgPoint,
  a: SvgPoint,
  b: SvgPoint
): SvgPoint {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-12) return [a[0], a[1]];
  let t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  return [a[0] + t * abx, a[1] + t * aby];
}

/**
 * Snap to nearest vertex (preferred) or edge among rings.
 * Returns original point when none within tol.
 */
export function snapPointToGeometry(
  point: SvgPoint,
  rings: SvgRing[],
  tolerance = SNAP_TOLERANCE_SVG
): SvgPoint {
  const tol2 = tolerance * tolerance;
  let bestVertex: SvgPoint | null = null;
  let bestVertexD = tol2;
  let bestEdge: SvgPoint | null = null;
  let bestEdgeD = tol2;

  for (const ring of rings) {
    if (!ring?.length) continue;
    for (let i = 0; i < ring.length; i++) {
      const v = ring[i];
      const d = distSq(point, v);
      if (d < bestVertexD) {
        bestVertexD = d;
        bestVertex = [v[0], v[1]];
      }
      const next = ring[(i + 1) % ring.length];
      const onEdge = closestPointOnSegment(point, v, next);
      const de = distSq(point, onEdge);
      if (de < bestEdgeD) {
        bestEdgeD = de;
        bestEdge = onEdge;
      }
    }
  }

  if (bestVertex) return bestVertex;
  if (bestEdge) return bestEdge;
  return point;
}

/** Place a point `distanceFt` at `angleDeg` from `origin` (0° = East, CCW, screen Y-down → clockwise visual). */
export function pointFromDistanceAngle(
  origin: SvgPoint,
  distanceFt: number,
  angleDeg: number,
  scaleRatio: number
): SvgPoint | null {
  if (!(distanceFt > 0) || !(scaleRatio > 0) || !Number.isFinite(angleDeg)) {
    return null;
  }
  const distSvg = distanceFt / scaleRatio;
  // Screen coords: +X east, +Y south. 0° = East, angles increase CCW in math → use standard atan2.
  const rad = (angleDeg * Math.PI) / 180;
  return [origin[0] + distSvg * Math.cos(rad), origin[1] + distSvg * Math.sin(rad)];
}

export function polylineLengthFt(
  points: SvgPoint[],
  scaleRatio: number
): number {
  if (!points || points.length < 2 || !(scaleRatio > 0)) return 0;
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    sum +=
      Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]) *
      scaleRatio;
  }
  return sum;
}

export type RenumberPreviewItem = {
  id: string;
  from: string;
  to: string;
};

/** Sort plots W→E then N→S by centroid; assign sequential numbers starting at startAt. */
export function buildRenumberPreview(
  plots: Plot[],
  ids: string[] | null,
  startAt = 1
): RenumberPreviewItem[] {
  const selected = ids
    ? plots.filter((p) => ids.includes(p.id) && p.status !== "road")
    : plots.filter((p) => p.status !== "road");

  const withCenter = selected
    .filter((p) => p.points && p.points.length >= 2)
    .map((p) => {
      const pts = p.points!;
      let sx = 0;
      let sy = 0;
      for (const [x, y] of pts) {
        sx += x;
        sy += y;
      }
      return {
        id: p.id,
        from: p.number || "",
        cx: sx / pts.length,
        cy: sy / pts.length,
      };
    });

  withCenter.sort((a, b) => a.cx - b.cx || a.cy - b.cy);

  return withCenter.map((p, i) => ({
    id: p.id,
    from: p.from,
    to: String(startAt + i),
  }));
}

export function applyRenumberPreview(
  plots: Plot[],
  preview: RenumberPreviewItem[]
): Plot[] {
  const map = new Map(preview.map((p) => [p.id, p.to]));
  return plots.map((p) => (map.has(p.id) ? { ...p, number: map.get(p.id)! } : p));
}

export type GeometryPreviewState = {
  rings: SvgRing[];
  areasFt: number[];
  source: "slice" | "subdivide" | "frontage" | "roadCut";
  /** Plot ids removed/replaced on confirm. */
  replaceIds: string[];
  /** Optional road ring for roadCut. */
  roadRing?: SvgRing;
  /** Base plot template for new parts (slice/subdivide/frontage). */
  templatePlot?: Plot;
};
