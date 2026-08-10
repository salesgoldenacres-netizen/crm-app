import { describe, expect, it } from "vitest";
import { validatePlotTopology } from "./adminMapTopology";

const square = (x: number, y: number, w = 10, h = 10): [number, number][] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

describe("validatePlotTopology", () => {
  it("detects pairwise overlaps between sellable plots", () => {
    const issues = validatePlotTopology([
      { id: "a", status: "available", points: square(0, 0) },
      { id: "b", status: "booked", points: square(5, 5) },
    ]);
    expect(issues.some((i) => i.type === "overlap")).toBe(true);
    expect(issues[0]).toMatchObject({
      plotId: "a",
      otherPlotId: "b",
      type: "overlap",
    });
  });

  it("ignores road/park/market plots", () => {
    const issues = validatePlotTopology([
      { id: "a", status: "available", points: square(0, 0) },
      { id: "road", status: "road", points: square(5, 5) },
      { id: "park", status: "park", points: square(4, 4) },
    ]);
    expect(issues).toEqual([]);
  });

  it("flags a gap between near-adjacent plots", () => {
    const issues = validatePlotTopology([
      { id: "a", status: "available", points: square(0, 0) },
      { id: "b", status: "available", points: square(11.2, 0) },
    ]);
    expect(issues.some((i) => i.type === "gap" || i.type === "sliver")).toBe(true);
  });

  it("flags a sliver when plots nearly touch", () => {
    const issues = validatePlotTopology([
      { id: "a", status: "available", points: square(0, 0) },
      { id: "b", status: "available", points: square(10.2, 0) },
    ]);
    expect(issues.some((i) => i.type === "sliver")).toBe(true);
  });

  it("returns empty when plots are far apart", () => {
    expect(
      validatePlotTopology([
        { id: "a", status: "available", points: square(0, 0) },
        { id: "b", status: "available", points: square(50, 50) },
      ])
    ).toEqual([]);
  });
});
