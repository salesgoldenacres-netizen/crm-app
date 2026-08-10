import type { Plot } from "@/shared/types";

/** GeoJSON FeatureCollection using SVG % coordinates (not WGS84). */
export type PlotGeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: {
      type: "Polygon";
      coordinates: number[][][];
    };
  }>;
};

function closeRing(points: [number, number][]): number[][] {
  if (!points.length) return [];
  const ring = points.map(([x, y]) => [x, y]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return ring;
}

/** Export plots with polygon geometry to a GeoJSON FeatureCollection. */
export function plotsToGeoJSON(plots: Plot[]): PlotGeoJsonFeatureCollection {
  const features = (plots || [])
    .filter((p) => Array.isArray(p.points) && p.points.length >= 3)
    .map((plot) => {
      const {
        points,
        id,
        number,
        size,
        rate,
        price,
        status,
        labelRotation,
        labelOffset,
        phase,
        setbacks,
      } = plot;
      return {
        type: "Feature" as const,
        properties: {
          id,
          number,
          size,
          rate,
          price,
          status,
          ...(labelRotation !== undefined ? { labelRotation } : {}),
          ...(labelOffset !== undefined ? { labelOffset } : {}),
          ...(phase !== undefined ? { phase } : {}),
          ...(setbacks !== undefined ? { setbacks } : {}),
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [closeRing(points as [number, number][])],
        },
      };
    });
  return { type: "FeatureCollection", features };
}

function ringToOpenPoints(ring: unknown): [number, number][] | null {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const pts: [number, number][] = [];
  for (const coord of ring) {
    if (!Array.isArray(coord) || coord.length < 2) return null;
    const x = Number(coord[0]);
    const y = Number(coord[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    pts.push([x, y]);
  }
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (first[0] === last[0] && first[1] === last[1] && pts.length > 3) {
    pts.pop();
  }
  return pts.length >= 3 ? pts : null;
}

function featureToPlot(
  feature: Record<string, unknown>,
  index: number
): Plot | null {
  if (feature.type !== "Feature") return null;
  const geometry = feature.geometry as Record<string, unknown> | undefined;
  if (!geometry || geometry.type !== "Polygon") return null;
  const coordinates = geometry.coordinates;
  if (!Array.isArray(coordinates) || !coordinates.length) return null;
  const points = ringToOpenPoints(coordinates[0]);
  if (!points) return null;

  const props = (feature.properties || {}) as Record<string, unknown>;
  const id =
    typeof props.id === "string" && props.id.trim()
      ? props.id.trim()
      : `geojson-${index + 1}`;

  return {
    id,
    number: String(props.number ?? ""),
    size: String(props.size ?? ""),
    rate: String(props.rate ?? ""),
    price: String(props.price ?? ""),
    status: String(props.status ?? "available"),
    points,
    ...(typeof props.labelRotation === "number"
      ? { labelRotation: props.labelRotation }
      : {}),
    ...(props.labelOffset &&
    typeof props.labelOffset === "object" &&
    props.labelOffset !== null
      ? { labelOffset: props.labelOffset as { x: number; y: number } }
      : {}),
    ...(typeof props.phase === "string" ? { phase: props.phase } : {}),
    ...(Array.isArray(props.setbacks)
      ? { setbacks: props.setbacks as Plot["setbacks"] }
      : {}),
  };
}

/**
 * Parse a GeoJSON FeatureCollection (or single Feature) into plots.
 * Throws if the payload is not a usable FeatureCollection/Feature with polygons.
 */
export function geoJSONToPlots(raw: unknown): Plot[] {
  if (!raw || typeof raw !== "object") {
    throw new Error("GeoJSON must be an object.");
  }
  const doc = raw as Record<string, unknown>;

  if (doc.type === "Feature") {
    const plot = featureToPlot(doc, 0);
    if (!plot) throw new Error("Feature is missing a valid Polygon geometry.");
    return [plot];
  }

  if (doc.type !== "FeatureCollection" || !Array.isArray(doc.features)) {
    throw new Error("Expected a GeoJSON FeatureCollection with a features array.");
  }

  const plots: Plot[] = [];
  doc.features.forEach((feat, idx) => {
    if (!feat || typeof feat !== "object") {
      throw new Error(`Feature at index ${idx} is invalid.`);
    }
    const plot = featureToPlot(feat as Record<string, unknown>, idx);
    if (!plot) {
      throw new Error(
        `Feature at index ${idx} is missing a valid Polygon geometry.`
      );
    }
    plots.push(plot);
  });

  if (!plots.length) {
    throw new Error("No polygon features found in GeoJSON.");
  }
  return plots;
}

/** Trigger a browser download for a GeoJSON blob. */
export function downloadGeoJSON(plots: Plot[], filename: string): void {
  const dataStr = JSON.stringify(plotsToGeoJSON(plots), null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/geo+json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".geojson") ? filename : `${filename}.geojson`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
