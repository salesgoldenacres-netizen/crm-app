import { describe, expect, it } from "vitest";
import {
  areaSqFt,
  edgeLengthsFt,
  facingHint,
  formatPlotLabel,
  perimeterFt,
} from "./adminMapMetrics";

const square: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];

describe("edgeLengthsFt", () => {
  it("scales each edge by scaleRatio", () => {
    expect(edgeLengthsFt(square, 2)).toEqual([20, 20, 20, 20]);
  });

  it("returns empty for invalid input", () => {
    expect(edgeLengthsFt([], 2)).toEqual([]);
    expect(edgeLengthsFt(square, Number.NaN)).toEqual([]);
  });
});

describe("areaSqFt / perimeterFt", () => {
  it("computes shoelace × scaleRatio²", () => {
    // SVG area 100; scale 2 → 400 sq ft
    expect(areaSqFt(square, 2)).toBeCloseTo(400, 6);
  });

  it("sums edge lengths for perimeter", () => {
    expect(perimeterFt(square, 2)).toBeCloseTo(80, 6);
  });
});

describe("facingHint", () => {
  it("returns E for a rectangle whose longest edge is horizontal", () => {
    const wide: [number, number][] = [
      [0, 0],
      [20, 0],
      [20, 5],
      [0, 5],
    ];
    expect(facingHint(wide)).toBe("E");
  });

  it("returns S for a tall rectangle with vertical longest edge downward", () => {
    const tall: [number, number][] = [
      [0, 0],
      [5, 0],
      [5, 20],
      [0, 20],
    ];
    expect(facingHint(tall)).toBe("S");
  });

  it("returns empty for degenerate input", () => {
    expect(facingHint([])).toBe("");
    expect(facingHint([[1, 1]])).toBe("");
  });
});

describe("formatPlotLabel", () => {
  const plot = { number: "A-1", size: "1200" };

  it("formats number only", () => {
    expect(formatPlotLabel(plot, square, 2, "number")).toBe("A-1");
  });

  it("formats number + computed area", () => {
    expect(formatPlotLabel(plot, square, 2, "number+area")).toBe("A-1\n400 sq ft");
  });

  it("formats number + area + facing", () => {
    const wide: [number, number][] = [
      [0, 0],
      [20, 0],
      [20, 5],
      [0, 5],
    ];
    expect(formatPlotLabel(plot, wide, 1, "number+area+facing")).toBe(
      "A-1\n100 sq ft\nFacing E"
    );
  });

  it("falls back to plot.size when scale is missing", () => {
    expect(formatPlotLabel(plot, square, 0, "number+area")).toBe("A-1\n1200 sq ft");
  });
});
