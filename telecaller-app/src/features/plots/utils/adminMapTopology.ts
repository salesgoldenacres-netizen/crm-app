import polygonClipping from "polygon-clipping";
import {
  boundingBoxOf,
  extractRingsFromClippingResult,
  svgPolygonArea,
  toClippingMultiPolygon,
  type SvgRing,
} from "./adminMapGeometry";

const NON_SELLABLE = new Set(["road", "park", "market"]);

/** SVG-unit thresholds for topology heuristics. */
const OVERLAP_AREA_EPS = 1e-4;
const SLIVER_PAD = 0.35;
const GAP_PAD = 1.5;

export type TopologyIssueType = "overlap" | "gap" | "sliver";
export type TopologySeverity = "low" | "medium" | "high";

export type TopologyIssue = {
  plotId: string;
  otherPlotId: string;
  type: TopologyIssueType;
  severity: TopologySeverity;
};

export type TopologyPlotInput = {
  id: string;
  status: string;
  points: SvgRing;
};

function isSellable(status: string): boolean {
  return !NON_SELLABLE.has(String(status || "").toLowerCase());
}

function bboxPad(
  points: SvgRing,
  pad: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  const b = boundingBoxOf(points);
  return {
    minX: b.minX - pad,
    maxX: b.maxX + pad,
    minY: b.minY - pad,
    maxY: b.maxY + pad,
  };
}

function bboxesIntersect(
  a: { minX: number; maxX: number; minY: number; maxY: number },
  b: { minX: number; maxX: number; minY: number; maxY: number }
): boolean {
  return !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY);
}

function intersectionArea(a: SvgRing, b: SvgRing): number {
  if (a.length < 3 || b.length < 3) return 0;
  try {
    const res = polygonClipping.intersection(
      toClippingMultiPolygon(a),
      toClippingMultiPolygon(b)
    );
    return extractRingsFromClippingResult(res).reduce(
      (sum, ring) => sum + svgPolygonArea(ring),
      0
    );
  } catch {
    return 0;
  }
}

function overlapSeverity(area: number, refArea: number): TopologySeverity {
  const ratio = refArea > 0 ? area / refArea : 1;
  if (ratio >= 0.15 || area >= 20) return "high";
  if (ratio >= 0.03 || area >= 2) return "medium";
  return "low";
}

function gapSeverity(pad: number): TopologySeverity {
  if (pad <= SLIVER_PAD) return "medium";
  return "low";
}

/**
 * Pairwise overlap / gap / sliver checks among sellable plots.
 * Gaps/slivers use padded-bbox adjacency when polygons do not meaningfully overlap.
 */
export function validatePlotTopology(plots: TopologyPlotInput[]): TopologyIssue[] {
  const sellable = plots.filter(
    (p) => p.id && Array.isArray(p.points) && p.points.length >= 3 && isSellable(p.status)
  );
  const issues: TopologyIssue[] = [];

  for (let i = 0; i < sellable.length; i++) {
    for (let j = i + 1; j < sellable.length; j++) {
      const a = sellable[i];
      const b = sellable[j];
      const area = intersectionArea(a.points, b.points);

      if (area > OVERLAP_AREA_EPS) {
        const ref = Math.min(svgPolygonArea(a.points), svgPolygonArea(b.points));
        issues.push({
          plotId: a.id,
          otherPlotId: b.id,
          type: "overlap",
          severity: overlapSeverity(area, ref),
        });
        continue;
      }

      const tight = bboxesIntersect(bboxPad(a.points, SLIVER_PAD), bboxPad(b.points, SLIVER_PAD));
      const loose = bboxesIntersect(bboxPad(a.points, GAP_PAD), bboxPad(b.points, GAP_PAD));
      if (!loose) continue;

      // Only flag when original bboxes are not already overlapping (near-adjacent).
      const rawTouch = bboxesIntersect(boundingBoxOf(a.points), boundingBoxOf(b.points));
      if (rawTouch && area <= OVERLAP_AREA_EPS) {
        // Touching/near-touching without measurable overlap → sliver candidate.
        issues.push({
          plotId: a.id,
          otherPlotId: b.id,
          type: "sliver",
          severity: gapSeverity(SLIVER_PAD),
        });
      } else if (tight) {
        issues.push({
          plotId: a.id,
          otherPlotId: b.id,
          type: "sliver",
          severity: gapSeverity(SLIVER_PAD),
        });
      } else {
        issues.push({
          plotId: a.id,
          otherPlotId: b.id,
          type: "gap",
          severity: gapSeverity(GAP_PAD),
        });
      }
    }
  }

  return issues;
}
