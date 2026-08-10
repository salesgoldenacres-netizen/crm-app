import polygonClipping from "polygon-clipping";

export type SvgPoint = [number, number];
export type SvgRing = SvgPoint[];

/** Closed ring as MultiPolygon for polygon-clipping. */
export function toClippingMultiPolygon(pts: SvgRing): polygonClipping.Geom {
  if (!pts.length) return [];
  const closed: SvgRing = [...pts, pts[0]];
  return [[closed]];
}

/** Flatten clipping result into open rings (drop closing vertex). */
export function extractRingsFromClippingResult(result: unknown): SvgRing[] {
  const extracted: SvgRing[] = [];
  if (!result || !Array.isArray(result)) return extracted;
  for (const multiPoly of result) {
    if (!Array.isArray(multiPoly)) continue;
    for (const poly of multiPoly) {
      if (Array.isArray(poly) && poly.length > 3) {
        extracted.push(poly.slice(0, -1) as SvgRing);
      }
    }
  }
  return extracted;
}

/**
 * Split a polygon with an infinite line through p1→p2.
 * Returns ≥2 rings on success, or [] when the cut does not bisect cleanly.
 */
export function slicePolygonByLine(
  plotPoints: SvgRing,
  p1: SvgPoint,
  p2: SvgPoint
): SvgRing[] {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const length = Math.hypot(dx, dy);
  if (length < 0.1 || !plotPoints.length) return [];

  const nx = (-dy / length) * 500;
  const ny = (dx / length) * 500;
  const extStart: SvgPoint = [p1[0] - dx * 10, p1[1] - dy * 10];
  const extEnd: SvgPoint = [p2[0] + dx * 10, p2[1] + dy * 10];

  const leftBox: SvgRing = [
    extStart,
    extEnd,
    [extEnd[0] + nx, extEnd[1] + ny],
    [extStart[0] + nx, extStart[1] + ny],
  ];
  const rightBox: SvgRing = [
    extStart,
    extEnd,
    [extEnd[0] - nx, extEnd[1] - ny],
    [extStart[0] - nx, extStart[1] - ny],
  ];

  const targetGeom = toClippingMultiPolygon(plotPoints);
  const leftRes = polygonClipping.intersection(
    targetGeom,
    toClippingMultiPolygon(leftBox)
  );
  const rightRes = polygonClipping.intersection(
    targetGeom,
    toClippingMultiPolygon(rightBox)
  );

  return [
    ...extractRingsFromClippingResult(leftRes),
    ...extractRingsFromClippingResult(rightRes),
  ];
}

export type BoundingBox = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
};

export function boundingBoxOf(points: SvgRing): BoundingBox {
  if (!points.length) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** SVG shoelace area (no scale). */
export function svgPolygonArea(points: SvgRing): number {
  if (!points || points.length < 3) return 0;
  let sum = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    sum += p1[0] * p2[1] - p2[0] * p1[1];
  }
  return Math.abs(sum) / 2;
}

const CLIP_MIN = -100;
const CLIP_MAX = 200;

function halfPlaneBox(
  direction: "vertical" | "horizontal",
  cutVal: number,
  side: "before" | "after"
): SvgRing {
  if (direction === "vertical") {
    return side === "before"
      ? [
          [CLIP_MIN, CLIP_MIN],
          [cutVal, CLIP_MIN],
          [cutVal, CLIP_MAX],
          [CLIP_MIN, CLIP_MAX],
        ]
      : [
          [cutVal, CLIP_MIN],
          [CLIP_MAX, CLIP_MIN],
          [CLIP_MAX, CLIP_MAX],
          [cutVal, CLIP_MAX],
        ];
  }
  return side === "before"
    ? [
        [CLIP_MIN, CLIP_MIN],
        [CLIP_MAX, CLIP_MIN],
        [CLIP_MAX, cutVal],
        [CLIP_MIN, cutVal],
      ]
    : [
        [CLIP_MIN, cutVal],
        [CLIP_MAX, cutVal],
        [CLIP_MAX, CLIP_MAX],
        [CLIP_MIN, CLIP_MAX],
      ];
}

function areaBeforeCut(
  polyPoints: SvgRing,
  direction: "vertical" | "horizontal",
  cutVal: number
): number {
  try {
    const res = polygonClipping.intersection(
      toClippingMultiPolygon(polyPoints),
      toClippingMultiPolygon(halfPlaneBox(direction, cutVal, "before"))
    );
    let area = 0;
    for (const ring of extractRingsFromClippingResult(res)) {
      area += svgPolygonArea(ring);
    }
    return area;
  } catch {
    return 0;
  }
}

/** Even spacing or equal-area cut positions along bbox. */
export function computeSubdivisionCuts(
  plotPoints: SvgRing,
  N: number,
  direction: "vertical" | "horizontal",
  method: "spacing" | "area"
): number[] {
  const bbox = boundingBoxOf(plotPoints);
  const cuts: number[] = [];

  if (method === "spacing") {
    if (direction === "vertical") {
      const step = bbox.width / N;
      for (let i = 1; i < N; i++) cuts.push(bbox.minX + i * step);
    } else {
      const step = bbox.height / N;
      for (let i = 1; i < N; i++) cuts.push(bbox.minY + i * step);
    }
    return cuts;
  }

  const totalArea = svgPolygonArea(plotPoints);
  const targetFraction = totalArea / N;

  if (direction === "vertical") {
    for (let i = 1; i < N; i++) {
      const targetLeftArea = targetFraction * i;
      let low = bbox.minX;
      let high = bbox.maxX;
      for (let iter = 0; iter < 18; iter++) {
        const mid = (low + high) / 2;
        if (areaBeforeCut(plotPoints, "vertical", mid) < targetLeftArea) {
          low = mid;
        } else {
          high = mid;
        }
      }
      cuts.push((low + high) / 2);
    }
  } else {
    for (let i = 1; i < N; i++) {
      const targetTopArea = targetFraction * i;
      let low = bbox.minY;
      let high = bbox.maxY;
      for (let iter = 0; iter < 18; iter++) {
        const mid = (low + high) / 2;
        if (areaBeforeCut(plotPoints, "horizontal", mid) < targetTopArea) {
          low = mid;
        } else {
          high = mid;
        }
      }
      cuts.push((low + high) / 2);
    }
  }

  return cuts;
}

/** Apply sorted axis-aligned cuts; returns resulting rings (≥1). */
export function applyAxisAlignedCuts(
  plotPoints: SvgRing,
  cuts: number[],
  direction: "vertical" | "horizontal"
): SvgRing[] {
  let currentPolys: SvgRing[] = [plotPoints];
  const sorted = [...cuts].sort((a, b) => a - b);

  for (const cutVal of sorted) {
    const nextPolys: SvgRing[] = [];
    let slicedAny = false;

    for (const poly of currentPolys) {
      const polyBbox = boundingBoxOf(poly);
      const inRange =
        direction === "vertical"
          ? cutVal > polyBbox.minX && cutVal < polyBbox.maxX
          : cutVal > polyBbox.minY && cutVal < polyBbox.maxY;

      if (inRange && !slicedAny) {
        const leftIntersection = polygonClipping.intersection(
          toClippingMultiPolygon(poly),
          toClippingMultiPolygon(halfPlaneBox(direction, cutVal, "before"))
        );
        const rightIntersection = polygonClipping.intersection(
          toClippingMultiPolygon(poly),
          toClippingMultiPolygon(halfPlaneBox(direction, cutVal, "after"))
        );
        const leftRings = extractRingsFromClippingResult(leftIntersection);
        const rightRings = extractRingsFromClippingResult(rightIntersection);

        if (leftRings.length > 0 || rightRings.length > 0) {
          nextPolys.push(...leftRings, ...rightRings);
          slicedAny = true;
        } else {
          nextPolys.push(poly);
        }
      } else {
        nextPolys.push(poly);
      }
    }
    currentPolys = nextPolys;
  }

  return currentPolys;
}

/** Full subdivide: compute cuts and split. Empty array if N < 2. */
export function subdividePolygon(
  plotPoints: SvgRing,
  N: number,
  direction: "vertical" | "horizontal",
  method: "spacing" | "area"
): SvgRing[] {
  if (N < 2 || !plotPoints.length) return [];
  const cuts = computeSubdivisionCuts(plotPoints, N, direction, method);
  return applyAxisAlignedCuts(plotPoints, cuts, direction);
}

/**
 * Cut a polygon with a line parallel to edge `edgeIndex`, inset by `depthFt`.
 * `scaleRatio` is ft per SVG unit. Returns ≥2 rings on success.
 */
export function splitParallelToEdge(
  plotPoints: SvgRing,
  edgeIndex: number,
  depthFt: number,
  scaleRatio: number
): SvgRing[] {
  if (
    !plotPoints?.length ||
    edgeIndex < 0 ||
    edgeIndex >= plotPoints.length ||
    !(depthFt > 0) ||
    !(scaleRatio > 0)
  ) {
    return [];
  }

  const a = plotPoints[edgeIndex];
  const b = plotPoints[(edgeIndex + 1) % plotPoints.length];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const edgeLen = Math.hypot(dx, dy);
  if (edgeLen < 1e-6) return [];

  // Outward-ish normal; flip toward polygon centroid so the cut is inset.
  let nx = -dy / edgeLen;
  let ny = dx / edgeLen;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of plotPoints) {
    cx += x;
    cy += y;
  }
  cx /= plotPoints.length;
  cy /= plotPoints.length;
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  if (nx * (cx - mx) + ny * (cy - my) < 0) {
    nx = -nx;
    ny = -ny;
  }

  const depthSvg = depthFt / scaleRatio;
  const p1: SvgPoint = [a[0] + nx * depthSvg, a[1] + ny * depthSvg];
  const p2: SvgPoint = [b[0] + nx * depthSvg, b[1] + ny * depthSvg];
  return slicePolygonByLine(plotPoints, p1, p2);
}
