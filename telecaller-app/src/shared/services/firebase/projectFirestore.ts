import type { DocumentData } from "firebase/firestore";
import type { Plot, Project, ProjectEasement } from "@/shared/types";

type PlotPointInput = [number, number] | { x: number; y: number };

/**
 * Firestore rejects nested arrays. App/runtime plot vertices are `[x, y][]`;
 * persist them as `{ x, y }` objects. Reverse with deserializePlotPointsForApp on read.
 */
export function serializePlotPointsForFirestore(
  points: PlotPointInput[] | undefined
): Array<{ x: number; y: number }> | undefined {
  if (!points) return undefined;
  return points.map((pt) =>
    Array.isArray(pt) ? { x: pt[0], y: pt[1] } : { x: pt.x, y: pt.y }
  );
}

/** Convert Firestore `{x,y}` vertices (or legacy tuples) back to `[x,y]` for the app. */
export function deserializePlotPointsForApp(
  points: PlotPointInput[] | undefined
): [number, number][] | undefined {
  if (!points) return undefined;
  return points.map((pt) =>
    Array.isArray(pt) ? [pt[0], pt[1]] : [pt.x, pt.y]
  );
}

function serializeEasementsForFirestore(
  easements: ProjectEasement[] | undefined
): Array<{ id: string; label: string; points: Array<{ x: number; y: number }> }> | undefined {
  if (!easements) return undefined;
  return easements.map((e) => {
    const points = serializePlotPointsForFirestore(e.points) ?? [];
    return { id: e.id, label: e.label, points };
  });
}

function deserializeEasementsForApp(
  easements: Array<{
    id: string;
    label: string;
    points?: PlotPointInput[];
  }> | undefined
): ProjectEasement[] | undefined {
  if (!easements) return undefined;
  return easements.map((e) => ({
    id: e.id,
    label: e.label,
    points: deserializePlotPointsForApp(e.points) ?? [],
  }));
}

/** Strip id and encode plot/easement points for a Firestore project document write. */
export function serializeProjectForFirestore(model: Project): DocumentData {
  const data = { ...model } as Record<string, unknown>;
  delete data.id;
  if (Array.isArray(model.plots)) {
    data.plots = model.plots.map((plot: Plot) => {
      const points = serializePlotPointsForFirestore(plot.points);
      return points !== undefined ? { ...plot, points } : { ...plot };
    });
  }
  if (Array.isArray(model.easements)) {
    data.easements = serializeEasementsForFirestore(model.easements);
  }
  return data as DocumentData;
}

/** Normalize project plots' and easements' points to `[x,y]` after a Firestore read. */
export function deserializeProjectPlotsForApp(model: Project): Project {
  const next: Project = { ...model };
  if (Array.isArray(model.plots)) {
    next.plots = model.plots.map((plot) => {
      const points = deserializePlotPointsForApp(
        plot.points as PlotPointInput[] | undefined
      );
      return points !== undefined ? { ...plot, points } : plot;
    });
  }
  if (Array.isArray(model.easements)) {
    next.easements = deserializeEasementsForApp(
      model.easements as Array<{
        id: string;
        label: string;
        points?: PlotPointInput[];
      }>
    );
  }
  return next;
}
