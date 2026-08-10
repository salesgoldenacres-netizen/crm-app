import { describe, expect, it } from "vitest";
import type { Project } from "@/shared/types";
import {
  adjustMapTransformOnPinch,
  adjustMapTransformOnWheel,
  computeScaleRatio,
  createPlotOnSave,
  getTouchDistance,
  getTouchMidpoint,
  mergeExistingPlotOnSave,
  panMapTransform,
  projectWithClearedImage,
  projectWithoutScaleRatio,
} from "./adminMapEditorHelpers";

const sampleProject: Project = {
  id: "p1",
  name: "Demo",
  location: "City",
  image: "https://example.com/layout.png",
  totalPlots: 10,
  plots: [],
  scaleRatio: 2.5,
};

const form = {
  number: "A-12",
  size: "1200",
  rate: "500",
  price: "600,000",
  status: "available",
  labelRotation: 15,
};

describe("mergeExistingPlotOnSave", () => {
  it("preserves edited points instead of dropping them", () => {
    const existing = {
      id: "p1",
      number: "A-1",
      size: "100",
      rate: "10",
      price: "1000",
      status: "sold",
      points: [
        [0, 0],
        [1, 0],
        [1, 1],
      ] as [number, number][],
      labelOffset: { x: 1, y: 2 },
    };
    const editedPoints: [number, number][] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];
    const result = mergeExistingPlotOnSave(existing, form, editedPoints);
    expect(result.points).toEqual(editedPoints);
    expect(result.number).toBe("A-12");
    expect(result.status).toBe("available");
    expect(result.labelOffset).toEqual({ x: 1, y: 2 });
    expect(result.id).toBe("p1");
  });
});

describe("createPlotOnSave", () => {
  it("includes drawing points on create", () => {
    const points: [number, number][] = [
      [10, 10],
      [20, 10],
      [20, 20],
    ];
    const result = createPlotOnSave(form, points, "new-1");
    expect(result.id).toBe("new-1");
    expect(result.points).toEqual(points);
    expect(result.number).toBe("A-12");
  });
});

describe("computeScaleRatio", () => {
  it("computes ft per SVG unit from calibration line", () => {
    const ratio = computeScaleRatio([0, 0], [10, 0], 100);
    expect(ratio).toBe(10);
  });

  it("rejects short lines and invalid feet", () => {
    expect(computeScaleRatio([0, 0], [0.1, 0], 100)).toBeNull();
    expect(computeScaleRatio([0, 0], [10, 0], 0)).toBeNull();
    expect(computeScaleRatio([0, 0], [10, 0], NaN)).toBeNull();
  });
});

describe("adjustMapTransformOnWheel", () => {
  it("zooms in and out within clamps", () => {
    expect(adjustMapTransformOnWheel({ scale: 1, x: 0, y: 0 }, -100).scale).toBe(1.1);
    expect(adjustMapTransformOnWheel({ scale: 1, x: 0, y: 0 }, 100).scale).toBe(0.9);
    expect(adjustMapTransformOnWheel({ scale: 0.25, x: 0, y: 0 }, 100).scale).toBe(0.25);
    expect(adjustMapTransformOnWheel({ scale: 4, x: 0, y: 0 }, -100).scale).toBe(4);
  });

  it("keeps the map point under the cursor stable when zooming", () => {
    const prev = { scale: 1, x: 40, y: 20 };
    const cursor = { x: 200, y: 150 };
    const worldBefore = {
      x: (cursor.x - prev.x) / prev.scale,
      y: (cursor.y - prev.y) / prev.scale,
    };

    const zoomedIn = adjustMapTransformOnWheel(prev, -100, cursor);
    expect(zoomedIn.scale).toBe(1.1);
    expect((cursor.x - zoomedIn.x) / zoomedIn.scale).toBeCloseTo(worldBefore.x);
    expect((cursor.y - zoomedIn.y) / zoomedIn.scale).toBeCloseTo(worldBefore.y);

    const zoomedOut = adjustMapTransformOnWheel(prev, 100, cursor);
    expect(zoomedOut.scale).toBe(0.9);
    expect((cursor.x - zoomedOut.x) / zoomedOut.scale).toBeCloseTo(worldBefore.x);
    expect((cursor.y - zoomedOut.y) / zoomedOut.scale).toBeCloseTo(worldBefore.y);
  });

  it("does not drift x/y when scale is already clamped", () => {
    const atMin = { scale: 0.25, x: 12, y: 34 };
    expect(adjustMapTransformOnWheel(atMin, 100, { x: 80, y: 90 })).toEqual(atMin);
    const atMax = { scale: 4, x: 12, y: 34 };
    expect(adjustMapTransformOnWheel(atMax, -100, { x: 80, y: 90 })).toEqual(atMax);
  });
});

describe("panMapTransform", () => {
  it("translates by client delta from gesture start", () => {
    const next = panMapTransform(
      { scale: 1.5, x: 10, y: 20 },
      { x: 100, y: 100 },
      { x: 130, y: 80 }
    );
    expect(next).toEqual({ scale: 1.5, x: 40, y: 0 });
  });
});

describe("projectWithoutScaleRatio", () => {
  it("omits scaleRatio so a full set clears calibration", () => {
    const next = projectWithoutScaleRatio(sampleProject);
    expect(next.scaleRatio).toBeUndefined();
    expect("scaleRatio" in next).toBe(false);
    expect(next.image).toBe(sampleProject.image);
    expect(next.id).toBe("p1");
  });
});

describe("projectWithClearedImage", () => {
  it("clears the layout image field", () => {
    expect(projectWithClearedImage(sampleProject).image).toBe("");
    expect(projectWithClearedImage(sampleProject).scaleRatio).toBe(2.5);
  });
});

describe("pinch helpers", () => {
  it("computes touch distance and midpoint", () => {
    expect(getTouchDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(getTouchMidpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({
      x: 5,
      y: 10,
    });
  });

  it("scales relative to start distance and clamps", () => {
    const start = { scale: 1, x: 0, y: 0 };
    const mid = { x: 100, y: 100 };
    const zoomed = adjustMapTransformOnPinch(start, 100, 200, mid, mid);
    expect(zoomed.scale).toBe(2);
    expect(zoomed.x).toBe(100 - ((100 - 0) / 1) * 2);
    expect(zoomed.y).toBe(100 - ((100 - 0) / 1) * 2);

    const clamped = adjustMapTransformOnPinch(start, 100, 1000, mid, mid);
    expect(clamped.scale).toBe(4);

    const ignored = adjustMapTransformOnPinch(start, 0, 200, mid, mid);
    expect(ignored).toEqual(start);
  });

  it("follows midpoint movement while zooming", () => {
    const start = { scale: 1, x: 10, y: 20 };
    const next = adjustMapTransformOnPinch(
      start,
      100,
      100,
      { x: 50, y: 60 },
      { x: 80, y: 90 }
    );
    expect(next.scale).toBe(1);
    expect(next.x).toBe(80 - ((50 - 10) / 1) * 1);
    expect(next.y).toBe(90 - ((60 - 20) / 1) * 1);
  });
});
