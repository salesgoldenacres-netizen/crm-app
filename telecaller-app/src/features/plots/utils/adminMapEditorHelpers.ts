import type { Plot, Project } from "@/shared/types";

export type PlotFormFields = {
  number: string;
  size: string;
  rate: string;
  price: string;
  status: string;
  labelRotation: number;
};

export type MapTransform = {
  scale: number;
  x: number;
  y: number;
};

export type ClientPoint = { x: number; y: number };

/** Merge sidebar form + edited vertices onto an existing plot (must keep points). */
export function mergeExistingPlotOnSave(
  existing: Plot,
  plotForm: PlotFormFields,
  points: [number, number][]
): Plot {
  return {
    ...existing,
    ...plotForm,
    points,
  };
}

/** Build a new plot from draw + form (points from editing session). */
export function createPlotOnSave(
  plotForm: PlotFormFields,
  points: [number, number][],
  id: string
): Plot {
  return {
    id,
    points,
    ...plotForm,
  };
}

/** Real-world feet / SVG-unit distance. Null when line too short or feet invalid. */
export function computeScaleRatio(
  p1: [number, number],
  p2: [number, number],
  realFeet: number
): number | null {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const pixelDistance = Math.sqrt(dx * dx + dy * dy);
  if (pixelDistance < 0.5 || !Number.isFinite(realFeet) || realFeet <= 0) {
    return null;
  }
  return realFeet / pixelDistance;
}

/** Drop scaleRatio so a full-document set clears persisted calibration. */
export function projectWithoutScaleRatio(project: Project): Project {
  const rest = { ...project };
  delete rest.scaleRatio;
  return rest as Project;
}

/** Clear layout image for persistence (falsy image hides the background layer). */
export function projectWithClearedImage(project: Project): Project {
  return { ...project, image: "" };
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const SCALE_STEP = 0.1;

function clampMapScale(scale: number): number {
  return Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)) * 100) / 100;
}

/**
 * Wheel zoom step for admin mapTransform (CSS transformOrigin 0 0).
 * When cursor is provided (coords in the same space as translate x/y),
 * adjusts x/y so the map point under the cursor stays fixed.
 */
export function adjustMapTransformOnWheel(
  prev: MapTransform,
  deltaY: number,
  cursor?: ClientPoint
): MapTransform {
  const delta = deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
  const nextScale = clampMapScale(prev.scale + delta);
  if (nextScale === prev.scale) {
    return prev;
  }
  if (!cursor || prev.scale <= 0) {
    return { ...prev, scale: nextScale };
  }
  const ratio = nextScale / prev.scale;
  return {
    scale: nextScale,
    x: cursor.x - (cursor.x - prev.x) * ratio,
    y: cursor.y - (cursor.y - prev.y) * ratio,
  };
}

export function panMapTransform(
  start: MapTransform,
  startClient: { x: number; y: number },
  currentClient: { x: number; y: number }
): MapTransform {
  return {
    ...start,
    x: start.x + (currentClient.x - startClient.x),
    y: start.y + (currentClient.y - startClient.y),
  };
}

export function getTouchDistance(a: ClientPoint, b: ClientPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function getTouchMidpoint(a: ClientPoint, b: ClientPoint): ClientPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Pinch zoom relative to gesture-start transform.
 * Keeps content under the start midpoint stable, then follows current midpoint.
 */
export function adjustMapTransformOnPinch(
  start: MapTransform,
  startDistance: number,
  currentDistance: number,
  startMid: ClientPoint,
  currentMid: ClientPoint
): MapTransform {
  if (
    startDistance <= 0 ||
    currentDistance <= 0 ||
    !Number.isFinite(startDistance) ||
    !Number.isFinite(currentDistance) ||
    start.scale <= 0
  ) {
    return { ...start };
  }

  const nextScale = clampMapScale(start.scale * (currentDistance / startDistance));
  const worldX = (startMid.x - start.x) / start.scale;
  const worldY = (startMid.y - start.y) / start.scale;

  return {
    scale: nextScale,
    x: currentMid.x - worldX * nextScale,
    y: currentMid.y - worldY * nextScale,
  };
}

export const DEFAULT_MAP_TRANSFORM: MapTransform = { scale: 1, x: 0, y: 0 };
