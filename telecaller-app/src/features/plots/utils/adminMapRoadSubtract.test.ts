import { describe, expect, it } from "vitest";
import { svgPolygonArea } from "./adminMapGeometry";
import {
  roadCorridorPolygon,
  subtractRoadFromPlots,
} from "./adminMapRoadSubtract";

describe("roadCorridorPolygon", () => {
  it("builds a corridor with expected width in SVG units", () => {
    // 20 ft wide, scaleRatio 2 ft/unit → half-width 5 units
    const ring = roadCorridorPolygon(
      [
        [0, 0],
        [100, 0],
      ],
      20,
      2
    );
    expect(ring.length).toBe(4);
    const ys = ring.map((p) => p[1]).sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(-5, 5);
    expect(ys[ys.length - 1]).toBeCloseTo(5, 5);
    expect(svgPolygonArea(ring)).toBeCloseTo(1000, 0);
  });

  it("returns empty for invalid inputs", () => {
    expect(roadCorridorPolygon([[0, 0]], 10, 1)).toEqual([]);
    expect(
      roadCorridorPolygon(
        [
          [0, 0],
          [10, 0],
        ],
        0,
        1
      )
    ).toEqual([]);
  });
});

describe("subtractRoadFromPlots", () => {
  it("cuts a road corridor out of a plot", () => {
    const plot: [number, number][] = [
      [0, -20],
      [100, -20],
      [100, 20],
      [0, 20],
    ];
    const road = roadCorridorPolygon(
      [
        [0, 0],
        [100, 0],
      ],
      20,
      2
    );
    const results = subtractRoadFromPlots([{ id: "p1", points: plot }], road);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("p1");
    expect(results[0].rings.length).toBeGreaterThanOrEqual(1);

    const remaining = results[0].rings.reduce((s, r) => s + svgPolygonArea(r), 0);
    const original = svgPolygonArea(plot);
    const roadArea = svgPolygonArea(road);
    expect(remaining).toBeCloseTo(original - roadArea, 0);
  });

  it("passes through plots when road ring is empty", () => {
    const pts: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(subtractRoadFromPlots([{ id: "a", points: pts }], [])).toEqual([
      { id: "a", rings: [pts] },
    ]);
  });
});
