import { describe, expect, it } from "vitest";
import {
  applyAxisAlignedCuts,
  computeSubdivisionCuts,
  slicePolygonByLine,
  splitParallelToEdge,
  subdividePolygon,
  svgPolygonArea,
} from "./adminMapGeometry";

const square: [number, number][] = [
  [20, 20],
  [40, 20],
  [40, 40],
  [20, 40],
];

describe("slicePolygonByLine", () => {
  it("bisects a square with a horizontal cut", () => {
    const rings = slicePolygonByLine(square, [15, 30], [45, 30]);
    expect(rings.length).toBe(2);
    const half = svgPolygonArea(square) / 2;
    const areas = rings.map(svgPolygonArea).sort((a, b) => a - b);
    expect(areas[0]).toBeCloseTo(half, 0);
    expect(areas[1]).toBeCloseTo(half, 0);
  });

  it("returns empty when the line is too short", () => {
    expect(slicePolygonByLine(square, [30, 30], [30.01, 30])).toEqual([]);
  });

  it("returns empty when the line misses the polygon", () => {
    expect(slicePolygonByLine(square, [0, 0], [10, 0]).length).toBeLessThan(2);
  });
});

describe("subdividePolygon", () => {
  it("splits into N parts with equal spacing (vertical)", () => {
    const rings = subdividePolygon(square, 2, "vertical", "spacing");
    expect(rings.length).toBe(2);
    expect(svgPolygonArea(rings[0]) + svgPolygonArea(rings[1])).toBeCloseTo(
      svgPolygonArea(square),
      0
    );
  });

  it("splits into N parts with equal area (horizontal)", () => {
    const rings = subdividePolygon(square, 3, "horizontal", "area");
    expect(rings.length).toBe(3);
    const total = rings.reduce((sum, r) => sum + svgPolygonArea(r), 0);
    expect(total).toBeCloseTo(svgPolygonArea(square), 0);
  });

  it("returns empty for N < 2", () => {
    expect(subdividePolygon(square, 1, "vertical", "spacing")).toEqual([]);
  });
});

describe("computeSubdivisionCuts / applyAxisAlignedCuts", () => {
  it("places mid cuts for spacing", () => {
    const cuts = computeSubdivisionCuts(square, 2, "vertical", "spacing");
    expect(cuts).toHaveLength(1);
    expect(cuts[0]).toBeCloseTo(30, 5);
    const rings = applyAxisAlignedCuts(square, cuts, "vertical");
    expect(rings.length).toBe(2);
  });
});

describe("splitParallelToEdge", () => {
  it("cuts a strip parallel to the bottom edge", () => {
    // edge 0 is top [20,20]->[40,20]; use edge 2 bottom [40,40]->[20,40]
    const rings = splitParallelToEdge(square, 2, 5, 1);
    expect(rings.length).toBeGreaterThanOrEqual(2);
    const total = rings.reduce((sum, r) => sum + svgPolygonArea(r), 0);
    expect(total).toBeCloseTo(svgPolygonArea(square), 0);
  });

  it("returns empty for invalid depth", () => {
    expect(splitParallelToEdge(square, 0, 0, 1)).toEqual([]);
  });
});
