import { describe, expect, it } from "vitest";
import type { Project } from "@/shared/types";
import {
  deserializePlotPointsForApp,
  deserializeProjectPlotsForApp,
  serializePlotPointsForFirestore,
  serializeProjectForFirestore,
} from "./projectFirestore";

describe("serializePlotPointsForFirestore", () => {
  it("converts nested [x,y] tuples to {x,y} objects (Firestore-safe)", () => {
    const result = serializePlotPointsForFirestore([
      [10, 20],
      [30, 40],
      [50, 60],
    ]);
    expect(result).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ]);
    expect(result?.some((pt) => Array.isArray(pt))).toBe(false);
  });

  it("leaves already-object points as {x,y}", () => {
    expect(
      serializePlotPointsForFirestore([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ])
    ).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
  });

  it("returns undefined when points are missing", () => {
    expect(serializePlotPointsForFirestore(undefined)).toBeUndefined();
  });
});

describe("deserializePlotPointsForApp", () => {
  it("converts {x,y} objects back to [x,y] tuples", () => {
    expect(
      deserializePlotPointsForApp([
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ])
    ).toEqual([
      [10, 20],
      [30, 40],
    ]);
  });

  it("passes through tuple points", () => {
    expect(
      deserializePlotPointsForApp([
        [1, 2],
        [3, 4],
      ])
    ).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });
});

describe("serializeProjectForFirestore", () => {
  it("encodes plot points and omits document id", () => {
    const project: Project = {
      id: "anugrahaa-meadows",
      name: "Anugrahaa Meadows",
      location: "Chennai",
      image: "/layout.png",
      totalPlots: 2,
      plots: [
        {
          id: "1",
          number: "A-1",
          size: "1200",
          rate: "500",
          price: "600000",
          status: "available",
          points: [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
          ],
        },
      ],
    };

    const data = serializeProjectForFirestore(project);

    expect(data.id).toBeUndefined();
    expect(data.plots).toEqual([
      {
        id: "1",
        number: "A-1",
        size: "1200",
        rate: "500",
        price: "600000",
        status: "available",
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
      },
    ]);
  });
});

describe("deserializeProjectPlotsForApp", () => {
  it("normalizes object points on plots", () => {
    const project = deserializeProjectPlotsForApp({
      id: "p1",
      name: "Demo",
      location: "City",
      image: "",
      totalPlots: 1,
      plots: [
        {
          id: "1",
          number: "A",
          size: "1",
          rate: "1",
          price: "1",
          status: "available",
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
          ],
        },
      ],
      scaleRatio: 2,
    } as unknown as Project);

    expect(project.plots[0].points).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
    expect(project.scaleRatio).toBe(2);
  });

  it("round-trips new optional project/plot fields and easement points", () => {
    const project: Project = {
      id: "p1",
      name: "Demo",
      location: "City",
      image: "",
      totalPlots: 1,
      labelContentMode: "number+area+facing",
      phases: [{ id: "ph1", name: "Phase 1", visible: true }],
      publicLayout: { enabled: true, shareToken: "abc123" },
      easements: [
        {
          id: "e1",
          label: "Drain",
          points: [
            [0, 0],
            [5, 0],
            [5, 2],
            [0, 2],
          ],
        },
      ],
      plots: [
        {
          id: "1",
          number: "A",
          size: "1",
          rate: "1",
          price: "1",
          status: "available",
          phase: "ph1",
          setbacks: [{ label: "Front", offsetFt: 10 }],
          points: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ],
        },
      ],
    };

    const data = serializeProjectForFirestore(project);
    expect(data.id).toBeUndefined();
    expect(data.labelContentMode).toBe("number+area+facing");
    expect(data.phases).toEqual([{ id: "ph1", name: "Phase 1", visible: true }]);
    expect(data.publicLayout).toEqual({ enabled: true, shareToken: "abc123" });
    expect((data.plots as Project["plots"])[0]).toMatchObject({
      phase: "ph1",
      setbacks: [{ label: "Front", offsetFt: 10 }],
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
    });
    expect(data.easements).toEqual([
      {
        id: "e1",
        label: "Drain",
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 2 },
          { x: 0, y: 2 },
        ],
      },
    ]);

    const restored = deserializeProjectPlotsForApp({
      ...data,
      id: "p1",
    } as unknown as Project);
    expect(restored.plots[0].points).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]);
    expect(restored.plots[0].phase).toBe("ph1");
    expect(restored.easements?.[0].points).toEqual([
      [0, 0],
      [5, 0],
      [5, 2],
      [0, 2],
    ]);
    expect(restored.labelContentMode).toBe("number+area+facing");
  });
});
