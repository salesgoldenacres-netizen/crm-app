import { describe, expect, it } from "vitest";
import {
  applyRenumberPreview,
  buildRenumberPreview,
  isSoftLockedStatus,
  pointFromDistanceAngle,
  polylineLengthFt,
  snapPointToGeometry,
} from "./adminMapEditorPrecision";
import type { Plot } from "@/shared/types";

describe("isSoftLockedStatus", () => {
  it("locks sold/booked/reserved", () => {
    expect(isSoftLockedStatus("sold")).toBe(true);
    expect(isSoftLockedStatus("booked")).toBe(true);
    expect(isSoftLockedStatus("reserved")).toBe(true);
    expect(isSoftLockedStatus("available")).toBe(false);
  });
});

describe("snapPointToGeometry", () => {
  it("snaps to nearby vertex or edge", () => {
    const ring: [number, number][] = [
      [10, 10],
      [20, 10],
      [20, 20],
      [10, 20],
    ];
    const toVertex = snapPointToGeometry([10.05, 10.05], [ring], 0.5);
    expect(toVertex[0]).toBeCloseTo(10, 5);
    expect(toVertex[1]).toBeCloseTo(10, 5);
    const toEdge = snapPointToGeometry([15, 10.2], [ring], 0.5);
    expect(toEdge[0]).toBeCloseTo(15, 5);
    expect(toEdge[1]).toBeCloseTo(10, 5);
  });
});

describe("pointFromDistanceAngle / polylineLengthFt", () => {
  it("places eastward point", () => {
    const p = pointFromDistanceAngle([0, 0], 10, 0, 1);
    expect(p).toEqual([10, 0]);
  });

  it("sums polyline length", () => {
    expect(
      polylineLengthFt(
        [
          [0, 0],
          [10, 0],
          [10, 10],
        ],
        2
      )
    ).toBeCloseTo(40, 5);
  });
});

describe("buildRenumberPreview", () => {
  it("orders W→E then N→S", () => {
    const plots: Plot[] = [
      {
        id: "a",
        number: "Z",
        size: "",
        rate: "",
        price: "",
        status: "available",
        points: [
          [40, 10],
          [50, 10],
          [50, 20],
          [40, 20],
        ],
      },
      {
        id: "b",
        number: "Y",
        size: "",
        rate: "",
        price: "",
        status: "available",
        points: [
          [10, 10],
          [20, 10],
          [20, 20],
          [10, 20],
        ],
      },
    ];
    const preview = buildRenumberPreview(plots, null, 1);
    expect(preview.map((p) => p.id)).toEqual(["b", "a"]);
    expect(preview.map((p) => p.to)).toEqual(["1", "2"]);
    const applied = applyRenumberPreview(plots, preview);
    expect(applied.find((p) => p.id === "b")?.number).toBe("1");
  });
});
