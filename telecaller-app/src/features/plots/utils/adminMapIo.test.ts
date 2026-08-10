import { describe, expect, it } from "vitest";
import type { Plot } from "@/shared/types";
import { geoJSONToPlots, plotsToGeoJSON } from "./adminMapIo";

const samplePlots: Plot[] = [
  {
    id: "p1",
    number: "A-1",
    size: "1200",
    rate: "500",
    price: "600000",
    status: "available",
    points: [
      [10, 10],
      [20, 10],
      [20, 20],
      [10, 20],
    ],
    phase: "phase-1",
  },
  {
    id: "road-1",
    number: "R1",
    size: "",
    rate: "",
    price: "",
    status: "road",
    points: [
      [0, 0],
      [5, 0],
      [5, 100],
    ],
  },
];

describe("plotsToGeoJSON", () => {
  it("exports polygon features and closes rings", () => {
    const fc = plotsToGeoJSON(samplePlots);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features).toHaveLength(2);
    const ring = fc.features[0].geometry.coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(fc.features[0].properties.id).toBe("p1");
    expect(fc.features[0].properties.phase).toBe("phase-1");
  });

  it("skips plots without enough points", () => {
    const fc = plotsToGeoJSON([
      { ...samplePlots[0], points: [[1, 1]] },
    ]);
    expect(fc.features).toHaveLength(0);
  });
});

describe("geoJSONToPlots", () => {
  it("round-trips FeatureCollection plots", () => {
    const plots = geoJSONToPlots(plotsToGeoJSON(samplePlots));
    expect(plots).toHaveLength(2);
    expect(plots[0].id).toBe("p1");
    expect(plots[0].points).toEqual(samplePlots[0].points);
    expect(plots[0].number).toBe("A-1");
  });

  it("accepts a single Feature", () => {
    const plots = geoJSONToPlots(plotsToGeoJSON([samplePlots[0]]).features[0]);
    expect(plots).toHaveLength(1);
    expect(plots[0].id).toBe("p1");
  });

  it("throws on invalid payloads", () => {
    expect(() => geoJSONToPlots(null)).toThrow(/object/i);
    expect(() => geoJSONToPlots({ type: "FeatureCollection", features: [] })).toThrow(
      /No polygon/
    );
  });
});
