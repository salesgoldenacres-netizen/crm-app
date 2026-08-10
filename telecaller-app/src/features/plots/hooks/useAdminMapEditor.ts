import { useState, useRef, useEffect, useCallback } from "react";
import polygonClipping from "polygon-clipping";
import { Project, Plot, EditingPlot } from "@/shared/types";
import { logAnalyticsEvent } from "@/shared/utils/analytics";
import { logger } from "@/shared/utils/logger";
import { uploadFile } from "@/shared/utils/uploadFile";
import { useToast } from "@/shared/components/Toast";
import type { InteractionDialogState } from "@/shared/components/ui/InteractionDialog";
import {
  adjustMapTransformOnPinch,
  adjustMapTransformOnWheel,
  computeScaleRatio,
  createPlotOnSave,
  DEFAULT_MAP_TRANSFORM,
  getTouchDistance,
  getTouchMidpoint,
  mergeExistingPlotOnSave,
  panMapTransform,
  projectWithClearedImage,
  projectWithoutScaleRatio,
  type MapTransform,
} from "@/features/plots/utils/adminMapEditorHelpers";
import {
  slicePolygonByLine,
  splitParallelToEdge,
  subdividePolygon,
  type SvgRing,
} from "@/features/plots/utils/adminMapGeometry";
import { areaSqFt } from "@/features/plots/utils/adminMapMetrics";
import { validatePlotTopology } from "@/features/plots/utils/adminMapTopology";
import {
  roadCorridorPolygon,
  subtractRoadFromPlots,
} from "@/features/plots/utils/adminMapRoadSubtract";
import {
  applyRenumberPreview,
  buildRenumberPreview,
  isSoftLockedStatus,
  pointFromDistanceAngle,
  snapPointToGeometry,
  type GeometryPreviewState,
} from "@/features/plots/utils/adminMapEditorPrecision";

interface UseAdminMapEditorProps {
  projectId: string;
  project: Project | undefined;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
}

export function useAdminMapEditor({
  projectId,
  project,
  updateProject,
}: UseAdminMapEditorProps) {
  const { toast } = useToast();
  const [interaction, setInteraction] = useState<InteractionDialogState | null>(
    null
  );
  const clearInteraction = useCallback(() => setInteraction(null), []);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const mapElementRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<string>("view");
  const [editSubMode, setEditSubMode] = useState<string>("vertices");
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [activePlotId, setActivePlotId] = useState<string | null>(null);

  const [draggedPointIdx, setDraggedPointIdx] = useState<number | null>(null);
  const [slicePoints, setSlicePoints] = useState<[number, number][]>([]);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [roadCutPoints, setRoadCutPoints] = useState<[number, number][]>([]);
  const [geometryPreview, setGeometryPreview] =
    useState<GeometryPreviewState | null>(null);
  const [softLockUnlockedIds, setSoftLockUnlockedIds] = useState<string[]>([]);
  const [selectedVertexIdx, setSelectedVertexIdx] = useState<number | null>(null);
  const [frontageForm, setFrontageForm] = useState({
    edgeIndex: 0,
    depthFt: 40,
  });
  const altHeldRef = useRef(false);
  const executeSliceRef = useRef<
    ((p1: [number, number], p2: [number, number]) => void) | null
  >(null);

  const [editingPlot, setEditingPlot] = useState<EditingPlot | null>(null);
  const [plotForm, setPlotForm] = useState({
    number: "",
    size: "",
    rate: "",
    price: "",
    status: "available",
    labelRotation: 0,
  });

  const [subdivisionActive, setSubdivisionActive] = useState(false);
  const [subdivisionForm, setSubdivisionForm] = useState({
    mode: "count",
    count: 2,
    targetSize: 1000,
    direction: "vertical",
    method: "area",
  });
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("available");
  const [bulkRate, setBulkRate] = useState("");
  const [freeSelectActive, setFreeSelectActive] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const [history, setHistory] = useState<{ past: Plot[][]; future: Plot[][] }>({
    past: [],
    future: [],
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  // Transform states
  const [transformAction, setTransformAction] = useState<string | null>(null);
  const [transformStartPoints, setTransformStartPoints] = useState<[number, number][]>([]);
  const [transformStartMouse, setTransformStartMouse] = useState<[number, number] | null>(null);

  // Calibration
  const [calibrationPoints, setCalibrationPoints] = useState<[number, number][]>([]);

  // Labels
  const [draggedLabelId, setDraggedLabelId] = useState<string | null>(null);
  const [draggedLabelStartOffset, setDraggedLabelStartOffset] = useState({ x: 0, y: 0 });

  // Layers (labels on by default for authoring)
  const [layers, setLayers] = useState<Record<string, { visible: boolean; locked: boolean }>>({
    plots: { visible: true, locked: false },
    roads: { visible: true, locked: false },
    amenities: { visible: true, locked: false },
    labels: { visible: true, locked: false },
  });

  // Search & Flash
  const [searchQuery, setSearchQuery] = useState("");
  const [flashPlotId, setFlashPlotId] = useState<string | null>(null);
  const [mapTransform, setMapTransform] = useState<MapTransform>(DEFAULT_MAP_TRANSFORM);
  const mapTransformRef = useRef(mapTransform);
  useEffect(() => {
    mapTransformRef.current = mapTransform;
  }, [mapTransform]);
  /** Local plot geometry while dragging — avoid Firestore writes on every mousemove. */
  const [dragPreviewPlots, setDragPreviewPlots] = useState<Plot[] | null>(null);
  const dragPreviewPlotsRef = useRef<Plot[] | null>(null);
  const dragFlushPendingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panGestureRef = useRef<{
    startClient: { x: number; y: number };
    startTransform: MapTransform;
  } | null>(null);
  const pinchGestureRef = useRef<{
    startTransform: MapTransform;
    startDistance: number;
    startMid: { x: number; y: number };
  } | null>(null);

  /** Persist project; toast on Firestore failure (store now rethrows). */
  const persistProject = useCallback(
    async (data: Project) => {
      try {
        await updateProject(projectId, data);
      } catch (err: unknown) {
        logger.error("AdminMapEditor", "Project save failed:", err);
        const msg = err instanceof Error ? err.message : String(err);
        toast(`Failed to save map changes: ${msg}`, "error");
        throw err;
      }
    },
    [updateProject, projectId, toast]
  );

  const reportTopologyIssues = useCallback(
    (plots: Plot[], allowProceed?: () => void) => {
      const issues = validatePlotTopology(
        plots
          .filter((p) => p.points && p.points.length >= 3)
          .map((p) => ({
            id: p.id,
            status: p.status,
            points: p.points as SvgRing,
          }))
      );
      if (issues.length === 0) {
        allowProceed?.();
        return;
      }
      const summary = issues
        .slice(0, 8)
        .map(
          (i) =>
            `${i.type} (${i.severity}): ${i.plotId.slice(0, 8)}… ↔ ${i.otherPlotId.slice(0, 8)}…`
        )
        .join("\n");
      const more =
        issues.length > 8 ? `\n…and ${issues.length - 8} more.` : "";
      if (allowProceed) {
        setInteraction({
          mode: "confirm",
          title: "Topology warnings",
          description: `${issues.length} issue(s) detected:\n${summary}${more}\n\nProceed anyway?`,
          confirmLabel: "Proceed anyway",
          confirmVariant: "danger",
          onConfirm: () => allowProceed(),
        });
      } else {
        toast(
          `Topology: ${issues.length} issue(s). ${issues[0].type} (${issues[0].severity}).`,
          "warning"
        );
      }
    },
    [toast]
  );

  const withSoftLockConfirm = useCallback(
    (plot: Plot | undefined, onProceed: () => void) => {
      if (!plot || !isSoftLockedStatus(plot.status)) {
        onProceed();
        return;
      }
      if (softLockUnlockedIds.includes(plot.id)) {
        onProceed();
        return;
      }
      setInteraction({
        mode: "confirm",
        title: "Locked plot",
        description: `Plot ${plot.number || plot.id} is ${plot.status}. Geometry edits require confirmation. Metadata edits are still allowed without this step.`,
        confirmLabel: "Edit geometry",
        confirmVariant: "danger",
        onConfirm: () => {
          setSoftLockUnlockedIds((prev) =>
            prev.includes(plot.id) ? prev : [...prev, plot.id]
          );
          onProceed();
        },
      });
    },
    [softLockUnlockedIds]
  );

  const maybeSnap = useCallback(
    (coords: [number, number], e?: { altKey?: boolean }): [number, number] => {
      const useSnap = Boolean(e?.altKey ?? altHeldRef.current);
      if (!useSnap || !project?.plots) return coords;
      const rings = project.plots
        .map((p) => p.points)
        .filter((pts): pts is [number, number][] => !!pts && pts.length > 0);
      if (drawingPoints.length) rings.push(drawingPoints);
      if (roadCutPoints.length) rings.push(roadCutPoints);
      return snapPointToGeometry(coords, rings);
    },
    [project, drawingPoints, roadCutPoints]
  );

  const setDragPreview = useCallback((plots: Plot[]) => {
    dragPreviewPlotsRef.current = plots;
    dragFlushPendingRef.current = true;
    setDragPreviewPlots(plots);
  }, []);

  const clearDragPreview = useCallback(() => {
    dragPreviewPlotsRef.current = null;
    dragFlushPendingRef.current = false;
    setDragPreviewPlots(null);
  }, []);

  /** Commit in-progress drag geometry once (mouseup / mouseleave). */
  const flushDragPreview = useCallback(() => {
    if (!dragFlushPendingRef.current) return;
    dragFlushPendingRef.current = false;
    const plots = dragPreviewPlotsRef.current;
    if (!plots || !project) return;
    void persistProject({ ...project, plots });
    // Keep overlay until store snapshot catches up (avoids flicker to pre-drag shape).
  }, [project, persistProject]);

  // Drop local drag overlay once Firestore-backed project matches preview.
  useEffect(() => {
    if (!dragPreviewPlots || !project?.plots) return;
    if (draggedPointIdx !== null || transformAction || draggedLabelId) return;
    if (JSON.stringify(project.plots) === JSON.stringify(dragPreviewPlots)) {
      // Defer so we do not setState synchronously inside the effect body.
      queueMicrotask(() => {
        clearDragPreview();
      });
    }
  }, [
    project?.plots,
    dragPreviewPlots,
    draggedPointIdx,
    transformAction,
    draggedLabelId,
    clearDragPreview,
  ]);

  // Log load event
  useEffect(() => {
    logAnalyticsEvent("map_editor_opened", { projectId });
  }, [projectId]);

  // Centroid calculations
  const getBoundingBox = useCallback((points: [number, number][]) => {
    if (!points || points.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0, cx: 0, cy: 0 };
    }
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    points.forEach((pt) => {
      if (pt[0] < minX) minX = pt[0];
      if (pt[0] > maxX) maxX = pt[0];
      if (pt[1] < minY) minY = pt[1];
      if (pt[1] > maxY) maxY = pt[1];
    });
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
    };
  }, []);

  const getCenter = useCallback((points: [number, number][]) => {
    if (!points || points.length === 0) return { x: 0, y: 0 };
    let minX = points[0][0],
      maxX = points[0][0];
    let minY = points[0][1],
      maxY = points[0][1];
    points.forEach((p) => {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    });
    return { x: minX + (maxX - minX) / 2, y: minY + (maxY - minY) / 2 };
  }, []);

  const getPlotLayer = useCallback((status: string) => {
    if (status === "road") return "roads";
    if (status === "park" || status === "market") return "amenities";
    return "plots";
  }, []);

  // Coordinates mapping
  const getSvgCoordinates = useCallback((e: { clientX: number; clientY: number }): [number, number] => {
    if (!svgRef.current) return [0, 0];
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return [x, y];
  }, []);

  // History past/future manager
  const pushToHistory = useCallback(
    (plotsState = project?.plots) => {
      if (!plotsState) return;
      setHistory((prev) => ({
        past: [...prev.past, JSON.parse(JSON.stringify(plotsState))].slice(-50),
        future: [],
      }));
    },
    [project]
  );

  const handleUndo = useCallback(() => {
    // In-progress draw: Ctrl+Z / header Undo remove last vertex (matches UI hint).
    if (mode === "draw" && drawingPoints.length > 0) {
      setDrawingPoints((prev) => prev.slice(0, -1));
      return;
    }
    if (history.past.length === 0 || !project) return;
    clearDragPreview();
    const previousState = history.past[history.past.length - 1];
    setHistory((prev) => {
      const newPast = [...prev.past];
      newPast.pop();
      return {
        past: newPast,
        future: [JSON.parse(JSON.stringify(project.plots)), ...prev.future].slice(0, 50),
      };
    });
    void persistProject({ ...project, plots: previousState });
  }, [mode, drawingPoints.length, history.past, project, persistProject, clearDragPreview]);

  const handleRedo = useCallback(() => {
    if (history.future.length === 0 || !project) return;
    clearDragPreview();
    const nextState = history.future[0];
    setHistory((prev) => {
      const newFuture = [...prev.future];
      newFuture.shift();
      return {
        past: [...prev.past, JSON.parse(JSON.stringify(project.plots))].slice(-50),
        future: newFuture,
      };
    });
    void persistProject({ ...project, plots: nextState });
  }, [history.future, project, persistProject, clearDragPreview]);

  // Non-passive wheel + touch pinch so zoom works on desktop and mobile.
  // Re-bind when project is available — viewport only mounts after load.
  useEffect(() => {
    if (!project) return;
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setMapTransform((prev) => {
        const mapEl = mapElementRef.current;
        if (!mapEl) return adjustMapTransformOnWheel(prev, e.deltaY);
        // Cursor in transform space: layout origin + translate (origin 0 0).
        // rect.left/top is the painted top-left (= layoutOrigin + translate).
        const rect = mapEl.getBoundingClientRect();
        const cursor = {
          x: e.clientX - rect.left + prev.x,
          y: e.clientY - rect.top + prev.y,
        };
        return adjustMapTransformOnWheel(prev, e.deltaY, cursor);
      });
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      isPanningRef.current = false;
      panGestureRef.current = null;
      const a = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const b = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      pinchGestureRef.current = {
        startTransform: { ...mapTransformRef.current },
        startDistance: getTouchDistance(a, b),
        startMid: getTouchMidpoint(a, b),
      };
      setIsMouseDown(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchGestureRef.current) return;
      e.preventDefault();
      const a = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const b = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const { startTransform, startDistance, startMid } = pinchGestureRef.current;
      setMapTransform(
        adjustMapTransformOnPinch(
          startTransform,
          startDistance,
          getTouchDistance(a, b),
          startMid,
          getTouchMidpoint(a, b)
        )
      );
    };

    const endPinch = () => {
      if (!pinchGestureRef.current) return;
      pinchGestureRef.current = null;
      setIsMouseDown(false);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) endPinch();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", endPinch);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", endPinch);
    };
  }, [project]);

  const placePrecisionPoint = useCallback(
    (distanceFt: number, angleDeg: number) => {
      if (!project?.scaleRatio) {
        toast("Calibrate scale before using precision placement.", "warning");
        return;
      }
      let origin: [number, number] | null = null;
      if (mode === "draw" && drawingPoints.length > 0) {
        origin = drawingPoints[drawingPoints.length - 1];
      } else if (mode === "slice" && slicePoints.length === 1) {
        origin = slicePoints[0];
      } else if (mode === "roadCut" && roadCutPoints.length > 0) {
        origin = roadCutPoints[roadCutPoints.length - 1];
      }
      if (!origin) {
        toast("Place an initial point before using Tab precision.", "warning");
        return;
      }
      const next = pointFromDistanceAngle(
        origin,
        distanceFt,
        angleDeg,
        project.scaleRatio
      );
      if (!next) {
        toast("Invalid distance or angle.", "error");
        return;
      }
      if (mode === "draw") {
        setDrawingPoints((prev) => [...prev, next]);
      } else if (mode === "slice" && slicePoints.length === 1) {
        executeSliceRef.current?.(slicePoints[0], next);
      } else if (mode === "roadCut") {
        setRoadCutPoints((prev) => [...prev, next]);
      }
    },
    [
      project,
      mode,
      drawingPoints,
      slicePoints,
      roadCutPoints,
      toast,
    ]
  );

  // Keyboard: undo/redo, Escape clear road cut/preview, Tab precision, arrows nudge, Alt snap flag
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        altHeldRef.current = true;
      }

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField =
        tag === "input" || tag === "textarea" || target?.isContentEditable;

      if (e.key === "Escape" && !inField) {
        if (mode === "roadCut") {
          e.preventDefault();
          setRoadCutPoints([]);
          return;
        }
        if (geometryPreview) {
          e.preventDefault();
          setGeometryPreview(null);
          return;
        }
      }

      if (inField) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod) {
        const key = e.key.toLowerCase();
        if (key === "z" && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (key === "y" || (key === "z" && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        } else if (key === "0") {
          e.preventDefault();
          setMapTransform(DEFAULT_MAP_TRANSFORM);
        }
        return;
      }

      if (
        e.key === "Tab" &&
        (mode === "draw" || mode === "slice" || mode === "roadCut")
      ) {
        e.preventDefault();
        setInteraction({
          mode: "prompt",
          title: "Precision point",
          description:
            "Enter distance in feet, then angle in degrees (0° = East, CCW).",
          defaultValue: "50",
          inputLabel: "Distance (feet)",
          confirmLabel: "Next: angle",
          onConfirm: async (distStr) => {
            const distanceFt = parseFloat(distStr || "");
            if (!Number.isFinite(distanceFt) || distanceFt <= 0) {
              toast("Invalid distance.", "error");
              return;
            }
            // Nested prompt after dialog closes — schedule next tick.
            setTimeout(() => {
              setInteraction({
                mode: "prompt",
                title: "Precision angle",
                description: "Angle in degrees (0° = East, counterclockwise).",
                defaultValue: "0",
                inputLabel: "Angle (degrees)",
                confirmLabel: "Place point",
                onConfirm: async (angleStr) => {
                  const angleDeg = parseFloat(angleStr || "");
                  if (!Number.isFinite(angleDeg)) {
                    toast("Invalid angle.", "error");
                    return;
                  }
                  placePrecisionPoint(distanceFt, angleDeg);
                },
              });
            }, 0);
          },
        });
        return;
      }

      if (
        (e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight") &&
        mode === "editShape" &&
        editSubMode === "vertices" &&
        activePlotId &&
        (selectedVertexIdx !== null || draggedPointIdx !== null)
      ) {
        e.preventDefault();
        const idx = selectedVertexIdx ?? draggedPointIdx;
        if (idx === null || !project) return;
        const step = e.shiftKey ? 0.01 : 0.1;
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;
        if (e.key === "ArrowUp") dy = -step;
        if (e.key === "ArrowDown") dy = step;

        const basePlots = dragPreviewPlotsRef.current ?? project.plots;
        const plot = basePlots.find((p) => p.id === activePlotId);
        if (!plot?.points?.[idx]) return;

        const run = () => {
          const newPoints = plot.points!.map((pt, i) =>
            i === idx
              ? ([pt[0] + dx, pt[1] + dy] as [number, number])
              : ([pt[0], pt[1]] as [number, number])
          );
          const updatedPlots = basePlots.map((p) =>
            p.id === activePlotId ? { ...p, points: newPoints } : p
          );
          setDragPreview(updatedPlots);
          setEditingPlot((prev) =>
            prev && prev.id === activePlotId
              ? { ...prev, points: newPoints }
              : prev
          );
        };
        withSoftLockConfirm(plot, run);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        altHeldRef.current = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    handleUndo,
    handleRedo,
    mode,
    geometryPreview,
    editSubMode,
    activePlotId,
    selectedVertexIdx,
    draggedPointIdx,
    project,
    placePrecisionPoint,
    setDragPreview,
    withSoftLockConfirm,
    toast,
  ]);

  // File uploading layout
  const handleMapEditorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    setUploadingImage(true);
    try {
      let downloadUrl: string;
      try {
        downloadUrl = await uploadFile("layouts", file);
      } catch (err: unknown) {
        logger.error("AdminMapEditor", "Image upload failed:", err);
        const msg = err instanceof Error ? err.message : String(err);
        toast("Failed to upload image: " + msg, "error");
        return;
      }
      await persistProject({ ...project, image: downloadUrl });
      toast("Layout image updated successfully!", "success");
    } catch {
      // persistProject already toasted Firestore failures
    } finally {
      setUploadingImage(false);
    }
  };

  // Shoelace Area Calculator
  const calculatePolygonArea = useCallback((points: [number, number][], scaleRatio: number | null | undefined) => {
    if (!points || points.length < 3) return 0;
    let sum = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      sum += p1[0] * p2[1] - p2[0] * p1[1];
    }
    const areaSvg = Math.abs(sum) / 2;
    if (scaleRatio) {
      return Math.round(areaSvg * scaleRatio ** 2);
    }
    return Math.round(areaSvg * 100) / 100;
  }, []);

  const handleEditShapeClick = useCallback(() => {
    // Canvas vertex/transform handles require activePlotId === plot.id in editShape mode.
    const plot = editingPlot
      ? (project?.plots.find((p) => p.id === editingPlot.id) ?? editingPlot)
      : undefined;
    const enter = () => {
      if (editingPlot?.id) {
        setActivePlotId(editingPlot.id);
      }
      setMode("editShape");
      setEditSubMode("vertices");
      setSelectedVertexIdx(null);
    };
    withSoftLockConfirm(plot as Plot | undefined, enter);
  }, [editingPlot, project, withSoftLockConfirm]);

  const handleFinishDrawing = useCallback(() => {
    if (drawingPoints.length < 3) {
      toast("A polygon must have at least 3 points.", "warning");
      return;
    }
    setEditingPlot({
      isNew: true,
      points: drawingPoints,
      id: "",
      number: "",
      size: "",
      rate: "",
      price: "",
      status: "available",
    });
    setPlotForm({
      number: "",
      size: "",
      rate: "",
      price: "",
      status: "available",
      labelRotation: 0,
    });
  }, [drawingPoints, toast]);

  const confirmGeometryPreview = useCallback(() => {
    if (!project || !geometryPreview) return;
    const preview = geometryPreview;
    const scale = project.scaleRatio || 0;

    const apply = () => {
      pushToHistory();
      const updatedPlots = project.plots.filter(
        (p) => !preview.replaceIds.includes(p.id)
      );

      if (preview.source === "roadCut" && preview.roadRing) {
        const sellable = project.plots.filter(
          (p) =>
            preview.replaceIds.includes(p.id) &&
            p.points &&
            p.points.length >= 3
        );
        const diffs = subtractRoadFromPlots(
          sellable.map((p) => ({ id: p.id, points: p.points as SvgRing })),
          preview.roadRing
        );
        const byId = new Map(sellable.map((p) => [p.id, p]));
        diffs.forEach((diff) => {
          const base = byId.get(diff.id);
          if (!base) return;
          diff.rings.forEach((ring, idx) => {
            const area =
              scale > 0 ? Math.round(areaSqFt(ring, scale)).toString() : base.size;
            updatedPlots.push({
              ...base,
              id: idx === 0 ? base.id : `${base.id}-cut-${idx}-${Date.now()}`,
              points: ring,
              size: area,
            });
          });
        });
        updatedPlots.push({
          id: `road-${Date.now()}`,
          number: "Road",
          size: scale > 0 ? Math.round(areaSqFt(preview.roadRing, scale)).toString() : "",
          rate: "",
          price: "",
          status: "road",
          points: preview.roadRing,
        });
      } else {
        const template = preview.templatePlot;
        preview.rings.forEach((ring, idx) => {
          const charSuffix = String.fromCharCode(65 + idx);
          const newNumber = template?.number
            ? preview.source === "slice"
              ? ""
              : `${template.number}${charSuffix}`
            : preview.source === "slice"
              ? ""
              : `${charSuffix}`;
          const newSize =
            scale > 0
              ? Math.round(areaSqFt(ring, scale)).toString()
              : template?.size || "";
          const rateVal = parseFloat(template?.rate || "");
          const priceVal = isNaN(rateVal)
            ? template?.price || ""
            : (parseFloat(newSize || "0") * rateVal).toLocaleString("en-IN");
          updatedPlots.push({
            ...(template || {
              number: "",
              size: "",
              rate: "",
              price: "",
              status: "available",
            }),
            id: `${Date.now()}-${idx}`,
            number: newNumber,
            size: newSize,
            price: priceVal,
            points: ring,
          });
        });
      }

      const finish = () => {
        void persistProject({ ...project, plots: updatedPlots }).then(() => {
          reportTopologyIssues(updatedPlots);
        });
        setGeometryPreview(null);
        setSlicePoints([]);
        setRoadCutPoints([]);
        setActivePlotId(null);
        setEditingPlot(null);
        setSubdivisionActive(false);
        setMode("view");
        toast(
          preview.source === "roadCut"
            ? "Road corridor applied."
            : `Area split into ${preview.rings.length} parts.`,
          "success"
        );
      };
      finish();
    };

    apply();
  }, [
    project,
    geometryPreview,
    pushToHistory,
    persistProject,
    reportTopologyIssues,
    toast,
  ]);

  const cancelGeometryPreview = useCallback(() => {
    setGeometryPreview(null);
    setSlicePoints([]);
  }, []);

  const executeSlice = useCallback((p1: [number, number], p2: [number, number]) => {
    if (!project) return;
    const plot = project.plots.find((p) => p.id === activePlotId);
    if (!plot || !plot.points) return;

    const run = () => {
      try {
        const allNewRings = slicePolygonByLine(
          plot.points as [number, number][],
          p1,
          p2
        );

        if (allNewRings.length < 2) {
          toast(
            "Could not slice polygon cleanly. Draw a line that crosses the area.",
            "warning"
          );
          setSlicePoints([]);
          return;
        }

        const scale = project.scaleRatio || 0;
        const areasFt = allNewRings.map((r) =>
          scale > 0 ? Math.round(areaSqFt(r, scale)) : 0
        );
        setGeometryPreview({
          rings: allNewRings,
          areasFt,
          source: "slice",
          replaceIds: [plot.id],
          templatePlot: plot,
        });
        setSlicePoints([]);
        setInteraction({
          mode: "confirm",
          title: "Confirm slice",
          description: `Split into ${allNewRings.length} parts${
            scale > 0
              ? `: ${areasFt.map((a) => `${a} sq ft`).join(", ")}`
              : ""
          }. Confirm to save.`,
          confirmLabel: "Confirm slice",
          onCancel: () => {
            setGeometryPreview(null);
          },
          onConfirm: () => {
            // confirmGeometryPreview reads latest geometryPreview via closure race —
            // apply directly here for reliability.
            pushToHistory();
            const updatedPlots = project.plots.filter((p) => p.id !== plot.id);
            allNewRings.forEach((ring, idx) => {
              updatedPlots.push({
                ...plot,
                id: `${Date.now()}-${idx}`,
                points: ring,
                number: "",
                size:
                  scale > 0
                    ? Math.round(areaSqFt(ring, scale)).toString()
                    : plot.size,
              });
            });
            void persistProject({ ...project, plots: updatedPlots }).then(() => {
              reportTopologyIssues(updatedPlots);
            });
            setGeometryPreview(null);
            setActivePlotId(null);
            toast(`Area sliced into ${allNewRings.length} parts.`, "success");
          },
        });
      } catch (err) {
        logger.error("AdminMapEditor", "Slice failed:", err);
        toast("Could not slice polygon cleanly. Try adjusting your line.", "error");
        setSlicePoints([]);
      }
    };

    withSoftLockConfirm(plot, run);
  }, [
    project,
    activePlotId,
    persistProject,
    pushToHistory,
    toast,
    withSoftLockConfirm,
    reportTopologyIssues,
  ]);

  useEffect(() => {
    executeSliceRef.current = executeSlice;
  }, [executeSlice]);

  const executeCalibration = useCallback((p1: [number, number], p2: [number, number]) => {
    if (!project) return;
    // Pre-check short line with same helper used on confirm (dummy feet).
    if (computeScaleRatio(p1, p2, 1) === null) {
      toast("Reference line is too short. Please select wider points.", "warning");
      setCalibrationPoints([]);
      return;
    }

    setInteraction({
      mode: "prompt",
      title: "Calibrate scale",
      description:
        "Enter the real-world distance of this reference line in feet.",
      defaultValue: "100",
      inputLabel: "Distance (feet)",
      confirmLabel: "Calibrate",
      onCancel: () => setCalibrationPoints([]),
      onConfirm: async (realFeet) => {
        const parsedFeet = parseFloat(realFeet || "");
        const scaleRatio = computeScaleRatio(p1, p2, parsedFeet);
        if (scaleRatio === null) {
          toast("Invalid length entered.", "error");
          setCalibrationPoints([]);
          return;
        }
        try {
          await persistProject({ ...project, scaleRatio });
          setCalibrationPoints([]);
          setMode("view");
          toast(
            `Calibration complete! Scale Ratio: ${scaleRatio.toFixed(3)} ft/unit.`,
            "success"
          );
        } catch {
          setCalibrationPoints([]);
          // persistProject already toasted the save failure
        }
      },
    });
  }, [project, persistProject, toast]);

  const handleRemoveMapImage = useCallback(() => {
    if (!project?.image) return;
    setInteraction({
      mode: "confirm",
      title: "Remove layout image",
      description:
        "Remove the background layout image from this project? Plot polygons stay unchanged.",
      confirmLabel: "Remove image",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await persistProject(projectWithClearedImage(project));
          toast("Layout image removed.", "success");
        } catch {
          // persistProject already toasted
        }
      },
    });
  }, [project, persistProject, toast]);

  const handleClearCalibration = useCallback(() => {
    if (!project?.scaleRatio) return;
    setInteraction({
      mode: "confirm",
      title: "Clear map scale",
      description:
        "Clear the calibrated scale ruler? Area auto-calculate will need recalibration.",
      confirmLabel: "Clear scale",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await persistProject(projectWithoutScaleRatio(project));
          setCalibrationPoints([]);
          if (mode === "calibrate") setMode("view");
          toast("Map scale cleared.", "success");
        } catch {
          // persistProject already toasted
        }
      },
    });
  }, [project, persistProject, toast, mode]);

  const handleSvgClick = useCallback((e: React.MouseEvent) => {
    const raw = getSvgCoordinates(e);
    const coords = maybeSnap(raw, e);

    if (mode === "draw") {
      setDrawingPoints([...drawingPoints, coords]);
    } else if (mode === "slice" && activePlotId) {
      if (slicePoints.length === 0) {
        setSlicePoints([coords]);
      } else if (slicePoints.length === 1) {
        executeSlice(slicePoints[0], coords);
      }
    } else if (mode === "calibrate") {
      if (calibrationPoints.length === 0) {
        setCalibrationPoints([coords]);
      } else if (calibrationPoints.length === 1) {
        executeCalibration(calibrationPoints[0], coords);
      }
    } else if (mode === "roadCut") {
      setRoadCutPoints((prev) => [...prev, coords]);
    }
  }, [
    mode,
    drawingPoints,
    slicePoints,
    calibrationPoints,
    activePlotId,
    getSvgCoordinates,
    maybeSnap,
    executeSlice,
    executeCalibration,
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!project) return;
    if (isPanningRef.current && panGestureRef.current) {
      const { startClient, startTransform } = panGestureRef.current;
      setMapTransform(
        panMapTransform(startTransform, startClient, {
          x: e.clientX,
          y: e.clientY,
        })
      );
      return;
    }
    const rawPos = getSvgCoordinates(e);
    const pos =
      mode === "draw" ||
      mode === "slice" ||
      mode === "roadCut" ||
      mode === "calibrate"
        ? maybeSnap(rawPos, e)
        : rawPos;

    if (mode === "slice" && activePlotId) {
      setMousePos(pos);
    } else if (mode === "calibrate" && calibrationPoints.length === 1) {
      setMousePos(pos);
    } else if (draggedPointIdx !== null && activePlotId && editSubMode === "vertices") {
      const basePlots = dragPreviewPlotsRef.current ?? project.plots;
      const updatedPlots = basePlots.map((p) => {
        if (p.id === activePlotId && p.points) {
          const newPoints = [...p.points];
          newPoints[draggedPointIdx] = pos;
          return { ...p, points: newPoints };
        }
        return p;
      });
      setDragPreview(updatedPlots);
      // Keep sidebar vertex state in sync so save does not revert canvas edits.
      setEditingPlot((prev) => {
        if (!prev || prev.id !== activePlotId || !prev.points) return prev;
        const newPoints = [...prev.points];
        newPoints[draggedPointIdx] = pos;
        return { ...prev, points: newPoints };
      });
    } else if (transformAction && activePlotId && editSubMode === "transform") {
      const startBbox = getBoundingBox(transformStartPoints);
      let updatedPoints = [...transformStartPoints];

      if (transformAction === "translate" && transformStartMouse) {
        const dx = pos[0] - transformStartMouse[0];
        const dy = pos[1] - transformStartMouse[1];
        updatedPoints = transformStartPoints.map((pt) => [pt[0] + dx, pt[1] + dy]);
      } else if (transformAction === "rotate" && transformStartMouse) {
        const cx = startBbox.cx;
        const cy = startBbox.cy;
        const angleStart = Math.atan2(transformStartMouse[1] - cy, transformStartMouse[0] - cx);
        const angleCurrent = Math.atan2(pos[1] - cy, pos[0] - cx);
        const dAngle = angleCurrent - angleStart;

        updatedPoints = transformStartPoints.map((pt) => {
          const dx = pt[0] - cx;
          const dy = pt[1] - cy;
          return [
            cx + dx * Math.cos(dAngle) - dy * Math.sin(dAngle),
            cy + dx * Math.sin(dAngle) + dy * Math.cos(dAngle),
          ];
        });
      } else if (transformAction.startsWith("scale-") && transformStartMouse) {
        const cx = startBbox.cx;
        const cy = startBbox.cy;
        let scaleX = 1;
        let scaleY = 1;

        if (transformAction === "scale-br") {
          scaleX = (pos[0] - cx) / (transformStartMouse[0] - cx);
          scaleY = (pos[1] - cy) / (transformStartMouse[1] - cy);
        } else if (transformAction === "scale-tl") {
          scaleX = (pos[0] - cx) / (transformStartMouse[0] - cx);
          scaleY = (pos[1] - cy) / (transformStartMouse[1] - cy);
        } else if (transformAction === "scale-tr") {
          scaleX = (pos[0] - cx) / (transformStartMouse[0] - cx);
          scaleY = (pos[1] - cy) / (transformStartMouse[1] - cy);
        } else if (transformAction === "scale-bl") {
          scaleX = (pos[0] - cx) / (transformStartMouse[0] - cx);
          scaleY = (pos[1] - cy) / (transformStartMouse[1] - cy);
        }

        if (Math.abs(scaleX) < 0.05) scaleX = 0.05 * Math.sign(scaleX);
        if (Math.abs(scaleY) < 0.05) scaleY = 0.05 * Math.sign(scaleY);

        if (e.shiftKey) {
          const s = Math.max(Math.abs(scaleX), Math.abs(scaleY));
          scaleX = s * Math.sign(scaleX);
          scaleY = s * Math.sign(scaleY);
        }

        updatedPoints = transformStartPoints.map((pt) => [
          cx + (pt[0] - cx) * scaleX,
          cy + (pt[1] - cy) * scaleY,
        ]);
      }

      const basePlots = dragPreviewPlotsRef.current ?? project.plots;
      const updatedPlots = basePlots.map((p) =>
        p.id === activePlotId ? { ...p, points: updatedPoints } : p
      );
      setDragPreview(updatedPlots);
      setEditingPlot((prev) => {
        if (!prev || prev.id !== activePlotId) return prev;
        return { ...prev, points: updatedPoints as [number, number][] };
      });
    } else if (draggedLabelId && mode === "editLabels" && transformStartMouse) {
      const dx = pos[0] - transformStartMouse[0];
      const dy = pos[1] - transformStartMouse[1];

      const basePlots = dragPreviewPlotsRef.current ?? project.plots;
      const updatedPlots = basePlots.map((p) => {
        if (p.id === draggedLabelId) {
          return {
            ...p,
            labelOffset: {
              x: (draggedLabelStartOffset.x || 0) + dx,
              y: (draggedLabelStartOffset.y || 0) + dy,
            },
          };
        }
        return p;
      });
      setDragPreview(updatedPlots);
    } else if (
      mode === "draw" ||
      mode === "slice" ||
      mode === "calibrate" ||
      mode === "roadCut"
    ) {
      setMousePos(pos);
    }
  }, [
    mode,
    project,
    activePlotId,
    draggedPointIdx,
    editSubMode,
    transformAction,
    transformStartPoints,
    transformStartMouse,
    draggedLabelId,
    draggedLabelStartOffset,
    calibrationPoints,
    getSvgCoordinates,
    getBoundingBox,
    setDragPreview,
    maybeSnap,
  ]);

  const handleMouseUp = useCallback(() => {
    flushDragPreview();
    setDraggedPointIdx(null);
    setTransformAction(null);
    setDraggedLabelId(null);
    setIsMouseDown(false);
    isPanningRef.current = false;
    panGestureRef.current = null;
  }, [flushDragPreview]);

  const handleMouseLeave = useCallback(() => {
    flushDragPreview();
    setDraggedPointIdx(null);
    setTransformAction(null);
    setDraggedLabelId(null);
    setMousePos(null);
    setIsMouseDown(false);
    isPanningRef.current = false;
    panGestureRef.current = null;
  }, [flushDragPreview]);

  const handleMapWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMapTransform((prev) => {
      const mapEl = mapElementRef.current;
      if (!mapEl) return adjustMapTransformOnWheel(prev, e.deltaY);
      const rect = mapEl.getBoundingClientRect();
      const cursor = {
        x: e.clientX - rect.left + prev.x,
        y: e.clientY - rect.top + prev.y,
      };
      return adjustMapTransformOnWheel(prev, e.deltaY, cursor);
    });
  }, []);

  const canStartPan = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      // Middle-mouse, Alt+drag (except placement modes where Alt = snap), or view left-drag.
      if ("button" in e && e.button === 1) return true;
      const placementMode =
        mode === "draw" ||
        mode === "slice" ||
        mode === "roadCut" ||
        mode === "calibrate";
      if (e.altKey && !placementMode) return true;
      if (mode === "view" && ("button" in e ? e.button === 0 : true)) return true;
      return false;
    },
    [mode]
  );

  const handleMapPanStart = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      if (!canStartPan(e)) return;
      // Don't steal bulk marquee / vertex / label drags.
      if (draggedPointIdx !== null || draggedLabelId || transformAction) return;
      if (mode === "bulk" && freeSelectActive) return;

      const target = e.target as Element | null;
      const hitInteractive =
        !!target?.closest?.(
          "polygon, circle, line, text, rect, [data-vertex], [data-label-handle]"
        );
      // View-mode left-drag pans empty space; middle/Alt always pan.
      const forcePan =
        ("button" in e && e.button === 1) || e.altKey;
      if (hitInteractive && !forcePan) return;

      if ("button" in e && e.button === 1) {
        e.preventDefault();
      }

      isPanningRef.current = true;
      setIsMouseDown(true);
      panGestureRef.current = {
        startClient: { x: e.clientX, y: e.clientY },
        startTransform: { ...mapTransform },
      };
    },
    [
      canStartPan,
      draggedPointIdx,
      draggedLabelId,
      transformAction,
      mode,
      freeSelectActive,
      mapTransform,
    ]
  );

  const handleMapPanMove = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    if (!isPanningRef.current || !panGestureRef.current) return;
    const { startClient, startTransform } = panGestureRef.current;
    setMapTransform(
      panMapTransform(startTransform, startClient, {
        x: e.clientX,
        y: e.clientY,
      })
    );
  }, []);

  const handleMapPanEnd = useCallback(() => {
    isPanningRef.current = false;
    panGestureRef.current = null;
    setIsMouseDown(false);
  }, []);

  const resetMapTransform = useCallback(() => {
    setMapTransform(DEFAULT_MAP_TRANSFORM);
  }, []);

  const canUndo =
    (mode === "draw" && drawingPoints.length > 0) || history.past.length > 0;
  const canRedo = history.future.length > 0;

  const handleMergePlots = useCallback(() => {
    if (!project || selectedPlotIds.length < 2) return;
    const selectedPlots = project.plots.filter((p) => selectedPlotIds.includes(p.id));
    const locked = selectedPlots.filter((p) => isSoftLockedStatus(p.status));

    const runMerge = () => {
      try {
        const toClippingFormat = (pts: [number, number][]) => [[...pts, pts[0]]];
        let currentGeom = [
          toClippingFormat(selectedPlots[0].points as [number, number][]),
        ];

        for (let i = 1; i < selectedPlots.length; i++) {
          currentGeom = polygonClipping.union(
            currentGeom as unknown as Parameters<typeof polygonClipping.union>[0],
            [
              toClippingFormat(selectedPlots[i].points as [number, number][]),
            ] as unknown as Parameters<typeof polygonClipping.union>[0]
          ) as unknown as [number, number][][][];
        }

        const extractRings = (result: unknown): [number, number][][] => {
          const extracted: [number, number][][] = [];
          if (!result || !Array.isArray(result)) return extracted;
          for (const multiPoly of result) {
            if (Array.isArray(multiPoly)) {
              for (const poly of multiPoly) {
                if (Array.isArray(poly) && poly.length > 3) {
                  extracted.push(poly.slice(0, -1) as [number, number][]);
                }
              }
            }
          }
          return extracted;
        };

        const rings = extractRings(currentGeom);
        if (rings.length > 0) {
          pushToHistory();
          const updatedPlots = project.plots.filter(
            (p) => !selectedPlotIds.includes(p.id)
          );

          const combinedNumber = selectedPlots
            .map((p) => p.number)
            .filter(Boolean)
            .join("+");
          const combinedSize = selectedPlots.reduce(
            (sum, p) => sum + (parseFloat(p.size) || 0),
            0
          );
          const combinedRate = selectedPlots[0].rate || "";
          const combinedPrice =
            combinedSize && combinedRate
              ? (combinedSize * parseFloat(combinedRate)).toLocaleString("en-IN")
              : "";
          const combinedStatus = selectedPlots[0].status || "available";

          rings.forEach((ring: [number, number][], idx: number) => {
            updatedPlots.push({
              id: `${Date.now()}-${idx}`,
              number: idx === 0 ? combinedNumber : `${combinedNumber}-${idx}`,
              size: idx === 0 ? combinedSize.toString() : "",
              rate: combinedRate,
              price: idx === 0 ? combinedPrice : "",
              status: combinedStatus,
              points: ring,
            });
          });

          void persistProject({ ...project, plots: updatedPlots }).then(() => {
            reportTopologyIssues(updatedPlots);
          });
          setSelectedPlotIds([]);
          setMode("view");
          toast("Plots merged successfully!", "success");
        }
      } catch (err) {
        logger.error("AdminMapEditor", "Merge failed:", err);
        toast(
          "Could not merge selected areas. Ensure they touch or overlap.",
          "error"
        );
      }
    };

    if (locked.length > 0) {
      setInteraction({
        mode: "confirm",
        title: "Merge locked plots",
        description: `${locked.length} sold/booked/reserved plot(s) are in the selection. Merge anyway?`,
        confirmLabel: "Merge anyway",
        confirmVariant: "danger",
        onConfirm: () => runMerge(),
      });
    } else {
      runMerge();
    }
  }, [
    project,
    selectedPlotIds,
    pushToHistory,
    persistProject,
    toast,
    reportTopologyIssues,
  ]);

  const handlePlotClick = useCallback((plot: Plot, e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "draw" || mode === "calibrate") return;

    const layerName = getPlotLayer(plot.status);
    if (layers[layerName]?.locked) return;

    if (mode === "bulk") {
      setSelectedPlotIds((prev) =>
        prev.includes(plot.id) ? prev.filter((pid) => pid !== plot.id) : [...prev, plot.id]
      );
      return;
    }

    if (mode === "slice") {
      if (activePlotId !== plot.id) {
        setActivePlotId(plot.id);
        setSlicePoints([]);
      }
      return;
    }

    if (mode === "editShape" && activePlotId === plot.id) return;

    // Keep activePlotId in sync so Edit Shape / Subdivide (which key off it) work.
    setActivePlotId(plot.id);
    setEditingPlot({ ...plot, isNew: false, points: plot.points || [] });
    setPlotForm({
      number: plot.number || "",
      size: plot.size || "",
      rate: plot.rate || "",
      price: plot.price || "",
      status: plot.status,
      labelRotation: plot.labelRotation || 0,
    });
  }, [mode, activePlotId, getPlotLayer, layers]);

  const handlePlotDoubleClick = useCallback((plot: Plot, e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "bulk" || mode === "calibrate") return;

    const layerName = getPlotLayer(plot.status);
    if (layers[layerName]?.locked) return;

    if (mode === "editShape" && activePlotId === plot.id) {
      setEditingPlot({ ...plot, isNew: false, points: plot.points || [] });
      setPlotForm({
        number: plot.number || "",
        size: plot.size || "",
        rate: plot.rate || "",
        price: plot.price || "",
        status: plot.status,
        labelRotation: plot.labelRotation || 0,
      });
    }
  }, [mode, activePlotId, getPlotLayer, layers]);

  const handleSavePlot = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !editingPlot) return;
    clearDragPreview();
    pushToHistory();
    let updatedPlots = [...project.plots];

    if (editingPlot.isNew) {
      updatedPlots.push(
        createPlotOnSave(plotForm, editingPlot.points, Date.now().toString())
      );
    } else {
      updatedPlots = updatedPlots.map((p) =>
        p.id === editingPlot.id
          ? mergeExistingPlotOnSave(p, plotForm, editingPlot.points)
          : p
      );
    }

    void persistProject({ ...project, plots: updatedPlots });
    setEditingPlot(null);
    setDrawingPoints([]);
    setActivePlotId(null);
    setMode("view");
  }, [project, editingPlot, plotForm, pushToHistory, persistProject, clearDragPreview]);

  const handleDeletePlot = useCallback(() => {
    if (!editingPlot || !project) return;
    if (editingPlot.isNew) {
      setEditingPlot(null);
      return;
    }
    setInteraction({
      mode: "confirm",
      title: "Delete feature",
      description: "Are you sure you want to delete this feature?",
      confirmLabel: "Delete",
      confirmVariant: "danger",
      onConfirm: () => {
        pushToHistory();
        const updatedPlots = project.plots.filter((p) => p.id !== editingPlot.id);
        void persistProject({ ...project, plots: updatedPlots });
        setEditingPlot(null);
        if (activePlotId === editingPlot.id) {
          setActivePlotId(null);
          setMode("view");
        }
      },
    });
  }, [editingPlot, project, activePlotId, pushToHistory, persistProject]);

  const handleAutoCalculateSize = useCallback(() => {
    if (!project || !editingPlot || !editingPlot.points) return;
    if (!project.scaleRatio) {
      toast("Please calibrate scale ruler first in settings menu.", "warning");
      return;
    }
    const area = calculatePolygonArea(editingPlot.points, project.scaleRatio);
    const calculatedPrice = (sizeVal: string, rateVal: string) => {
      const s = parseFloat(sizeVal);
      const r = parseFloat(rateVal);
      if (!isNaN(s) && !isNaN(r)) return (s * r).toLocaleString("en-IN");
      return plotForm.price;
    };
    setPlotForm((prev) => ({
      ...prev,
      size: area.toString(),
      price: calculatedPrice(area.toString(), prev.rate),
    }));
  }, [project, editingPlot, calculatePolygonArea, plotForm.price, toast]);

  const orthogonalizePlot = useCallback((plotId: string) => {
    if (!project) return;
    const plot = project.plots.find((p) => p.id === plotId);
    if (!plot || !plot.points || plot.points.length !== 4) {
      toast("Orthogonalization is supported for 4-point areas.", "warning");
      return;
    }

    pushToHistory();

    let minX = plot.points[0][0],
      maxX = plot.points[0][0];
    let minY = plot.points[0][1],
      maxY = plot.points[0][1];
    plot.points.forEach((pt: [number, number]) => {
      if (pt[0] < minX) minX = pt[0];
      if (pt[0] > maxX) maxX = pt[0];
      if (pt[1] < minY) minY = pt[1];
      if (pt[1] > maxY) maxY = pt[1];
    });

    const corners: [number, number][] = [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
    ];

    const newPoints = plot.points.map((pt: [number, number]) => {
      let closest = corners[0];
      let minDist = Infinity;
      corners.forEach((c) => {
        const d = (pt[0] - c[0]) ** 2 + (pt[1] - c[1]) ** 2;
        if (d < minDist) {
          minDist = d;
          closest = c;
        }
      });
      return closest;
    });

    const updatedPlots = project.plots.map((p) =>
      p.id === plotId ? { ...p, points: newPoints } : p
    );
    void persistProject({ ...project, plots: updatedPlots });
    setEditingPlot((prev) => {
      if (!prev || prev.id !== plotId) return prev;
      return { ...prev, points: newPoints };
    });
  }, [project, persistProject, pushToHistory, toast]);

  const handleDuplicatePlot = useCallback((plot: Plot) => {
    if (!project || !plot.points) return;
    pushToHistory();
    const offset = 3.0;
    const newPoints = plot.points.map((pt: [number, number]) => [pt[0] + offset, pt[1]] as [number, number]);

    const newId = `${Date.now()}`;
    const newPlot = {
      ...plot,
      id: newId,
      number: plot.number ? `${plot.number} Copy` : "Copy",
      points: newPoints,
      status: "available",
    };

    const updatedPlots = [...project.plots, newPlot];
    void persistProject({ ...project, plots: updatedPlots });
    setActivePlotId(newId);
    setMode("editShape");
    setEditSubMode("transform");
    setEditingPlot(null);
  }, [project, persistProject, pushToHistory]);

  const executeSubdivision = useCallback(() => {
    if (!project) return;
    const targetId = activePlotId || editingPlot?.id || null;
    const plot = project.plots.find((p) => p.id === targetId);
    if (!plot || !plot.points) return;

    const run = () => {
      const { mode: subMode, count, targetSize, direction, method } = subdivisionForm;
      let N = parseInt(count as unknown as string);

      if (subMode === "size") {
        const totalArea = calculatePolygonArea(
          plot.points as [number, number][],
          project.scaleRatio
        );
        const tSize = parseFloat(targetSize as unknown as string);
        if (isNaN(tSize) || tSize <= 0) {
          toast("Please enter a valid target size.", "warning");
          return;
        }
        if (!project.scaleRatio) {
          toast(
            "Scale calibration is required to subdivide by square footage.",
            "warning"
          );
          return;
        }
        N = Math.round(totalArea / tSize);
        if (N < 2) {
          toast(
            `Plot area (${totalArea} sq ft) is too small to subdivide into ${tSize} sq ft plots.`,
            "warning"
          );
          return;
        }
      }

      if (isNaN(N) || N < 2) {
        toast("Plot must be subdivided into at least 2 parts.", "warning");
        return;
      }

      try {
        const currentPolys = subdividePolygon(
          plot.points as [number, number][],
          N,
          direction === "horizontal" ? "horizontal" : "vertical",
          method === "spacing" ? "spacing" : "area"
        );

        if (currentPolys.length < 2) {
          toast("Failed to divide plot geometry cleanly.", "error");
          return;
        }

        const scale = project.scaleRatio || 0;
        const areasFt = currentPolys.map((r) =>
          scale > 0 ? Math.round(areaSqFt(r, scale)) : 0
        );
        setGeometryPreview({
          rings: currentPolys,
          areasFt,
          source: "subdivide",
          replaceIds: [plot.id],
          templatePlot: plot,
        });
        setInteraction({
          mode: "confirm",
          title: "Confirm subdivide",
          description: `Create ${currentPolys.length} parts${
            scale > 0
              ? `: ${areasFt.map((a) => `${a} sq ft`).join(", ")}`
              : ""
          }. Confirm to save.`,
          confirmLabel: "Confirm subdivide",
          onCancel: () => setGeometryPreview(null),
          onConfirm: () => {
            pushToHistory();
            const updatedPlots = project.plots.filter((p) => p.id !== targetId);
            currentPolys.forEach((polyPoints, idx) => {
              const charSuffix = String.fromCharCode(65 + idx);
              const newNumber = plot.number
                ? `${plot.number}${charSuffix}`
                : `${charSuffix}`;
              const newSize = calculatePolygonArea(polyPoints, project.scaleRatio);
              const rateVal = parseFloat(plot.rate);
              const priceVal = isNaN(rateVal)
                ? plot.price
                : (newSize * rateVal).toLocaleString("en-IN");
              updatedPlots.push({
                ...plot,
                id: `${Date.now()}-${idx}`,
                number: newNumber,
                size: newSize.toString(),
                price: priceVal,
                points: polyPoints,
              });
            });
            void persistProject({ ...project, plots: updatedPlots }).then(() => {
              reportTopologyIssues(updatedPlots);
            });
            setGeometryPreview(null);
            setEditingPlot(null);
            setActivePlotId(null);
            setSubdivisionActive(false);
            setMode("view");
            toast(
              `Plot subdivided successfully into ${currentPolys.length} parts!`,
              "success"
            );
          },
        });
      } catch (err) {
        logger.error("AdminMapEditor", "Subdivision failed:", err);
        toast(
          "An error occurred during subdivision clipping. Please try different parameters.",
          "error"
        );
      }
    };

    withSoftLockConfirm(plot, run);
  }, [
    project,
    activePlotId,
    editingPlot,
    subdivisionForm,
    calculatePolygonArea,
    pushToHistory,
    persistProject,
    toast,
    withSoftLockConfirm,
    reportTopologyIssues,
  ]);

  const executeFrontageSplit = useCallback(() => {
    if (!project) return;
    const targetId = activePlotId || editingPlot?.id || null;
    const plot = project.plots.find((p) => p.id === targetId);
    if (!plot?.points) return;
    if (!project.scaleRatio) {
      toast("Calibrate scale before frontage split.", "warning");
      return;
    }

    const run = () => {
      const rings = splitParallelToEdge(
        plot.points as SvgRing,
        frontageForm.edgeIndex,
        frontageForm.depthFt,
        project.scaleRatio!
      );
      if (rings.length < 2) {
        toast(
          "Could not cut parallel to that edge. Try a different edge or depth.",
          "warning"
        );
        return;
      }
      const areasFt = rings.map((r) => Math.round(areaSqFt(r, project.scaleRatio!)));
      setGeometryPreview({
        rings,
        areasFt,
        source: "frontage",
        replaceIds: [plot.id],
        templatePlot: plot,
      });
      setInteraction({
        mode: "confirm",
        title: "Confirm frontage split",
        description: `Split into ${rings.length} parts: ${areasFt
          .map((a) => `${a} sq ft`)
          .join(", ")}. Confirm to save.`,
        confirmLabel: "Confirm split",
        onCancel: () => setGeometryPreview(null),
        onConfirm: () => {
          pushToHistory();
          const updatedPlots = project.plots.filter((p) => p.id !== plot.id);
          rings.forEach((ring, idx) => {
            const charSuffix = String.fromCharCode(65 + idx);
            const newNumber = plot.number
              ? `${plot.number}${charSuffix}`
              : `${charSuffix}`;
            const newSize = Math.round(areaSqFt(ring, project.scaleRatio!));
            const rateVal = parseFloat(plot.rate);
            const priceVal = isNaN(rateVal)
              ? plot.price
              : (newSize * rateVal).toLocaleString("en-IN");
            updatedPlots.push({
              ...plot,
              id: `${Date.now()}-${idx}`,
              number: newNumber,
              size: newSize.toString(),
              price: priceVal,
              points: ring,
            });
          });
          void persistProject({ ...project, plots: updatedPlots }).then(() => {
            reportTopologyIssues(updatedPlots);
          });
          setGeometryPreview(null);
          setEditingPlot(null);
          setActivePlotId(null);
          setSubdivisionActive(false);
          setMode("view");
          toast(`Frontage split into ${rings.length} parts.`, "success");
        },
      });
    };

    withSoftLockConfirm(plot, run);
  }, [
    project,
    activePlotId,
    editingPlot,
    frontageForm,
    pushToHistory,
    persistProject,
    toast,
    withSoftLockConfirm,
    reportTopologyIssues,
  ]);

  const handleFinishRoadCut = useCallback(() => {
    if (!project) return;
    if (roadCutPoints.length < 2) {
      toast("Draw a centerline with at least 2 points.", "warning");
      return;
    }
    if (!project.scaleRatio) {
      toast("Calibrate scale before road cut.", "warning");
      return;
    }
    setInteraction({
      mode: "prompt",
      title: "Road / ROW width",
      description: "Enter corridor width in feet. Sellable plots under the corridor will be subtracted.",
      defaultValue: "30",
      inputLabel: "Width (feet)",
      confirmLabel: "Preview cut",
      onConfirm: async (widthStr) => {
        const widthFt = parseFloat(widthStr || "");
        if (!Number.isFinite(widthFt) || widthFt <= 0) {
          toast("Invalid width.", "error");
          return;
        }
        const roadRing = roadCorridorPolygon(
          roadCutPoints,
          widthFt,
          project.scaleRatio!
        );
        if (roadRing.length < 3) {
          toast("Could not build road corridor.", "error");
          return;
        }
        const sellable = project.plots.filter(
          (p) =>
            p.points &&
            p.points.length >= 3 &&
            !["road", "park", "market"].includes(String(p.status).toLowerCase())
        );
        const locked = sellable.filter((p) => isSoftLockedStatus(p.status));
        const proceed = () => {
          const diffs = subtractRoadFromPlots(
            sellable.map((p) => ({ id: p.id, points: p.points as SvgRing })),
            roadRing
          );
          const previewRings = diffs.flatMap((d) => d.rings);
          const areasFt = previewRings.map((r) =>
            Math.round(areaSqFt(r, project.scaleRatio!))
          );
          setGeometryPreview({
            rings: previewRings,
            areasFt,
            source: "roadCut",
            replaceIds: sellable.map((p) => p.id),
            roadRing,
          });
          setInteraction({
            mode: "confirm",
            title: "Confirm road cut",
            description: `Subtract ${widthFt} ft ROW from ${sellable.length} sellable plot(s) and create a road polygon. Confirm to save.`,
            confirmLabel: "Confirm road cut",
            onCancel: () => setGeometryPreview(null),
            onConfirm: () => {
              pushToHistory();
              const updatedPlots = project.plots.filter(
                (p) => !sellable.some((s) => s.id === p.id)
              );
              const byId = new Map(sellable.map((p) => [p.id, p]));
              diffs.forEach((diff) => {
                const base = byId.get(diff.id);
                if (!base) return;
                diff.rings.forEach((ring, idx) => {
                  updatedPlots.push({
                    ...base,
                    id:
                      idx === 0
                        ? base.id
                        : `${base.id}-cut-${idx}-${Date.now()}`,
                    points: ring,
                    size: Math.round(
                      areaSqFt(ring, project.scaleRatio!)
                    ).toString(),
                  });
                });
              });
              updatedPlots.push({
                id: `road-${Date.now()}`,
                number: "Road",
                size: Math.round(
                  areaSqFt(roadRing, project.scaleRatio!)
                ).toString(),
                rate: "",
                price: "",
                status: "road",
                points: roadRing,
              });
              void persistProject({ ...project, plots: updatedPlots }).then(
                () => {
                  reportTopologyIssues(updatedPlots);
                }
              );
              setGeometryPreview(null);
              setRoadCutPoints([]);
              setMode("view");
              toast("Road corridor applied.", "success");
            },
          });
        };

        if (locked.length > 0) {
          setTimeout(() => {
            setInteraction({
              mode: "confirm",
              title: "Locked plots in corridor",
              description: `${locked.length} sold/booked/reserved plot(s) will be modified. Continue?`,
              confirmLabel: "Continue",
              confirmVariant: "danger",
              onConfirm: () => proceed(),
            });
          }, 0);
        } else {
          proceed();
        }
      },
    });
  }, [
    project,
    roadCutPoints,
    pushToHistory,
    persistProject,
    toast,
    reportTopologyIssues,
  ]);

  const handleBatchRenumber = useCallback(() => {
    if (!project) return;
    const ids =
      selectedPlotIds.length > 0 ? selectedPlotIds : null;
    const preview = buildRenumberPreview(project.plots, ids, 1);
    if (preview.length === 0) {
      toast("No plots to renumber.", "warning");
      return;
    }
    const list = preview
      .slice(0, 20)
      .map((p) => `${p.from || "(blank)"} → ${p.to}`)
      .join("\n");
    const more =
      preview.length > 20 ? `\n…and ${preview.length - 20} more` : "";
    setInteraction({
      mode: "confirm",
      title: "Batch renumber",
      description: `Renumber ${preview.length} plot(s) W→E then N→S:\n${list}${more}`,
      confirmLabel: "Apply renumber",
      onConfirm: () => {
        pushToHistory();
        const updatedPlots = applyRenumberPreview(project.plots, preview);
        void persistProject({ ...project, plots: updatedPlots });
        setSelectedPlotIds([]);
        toast(`Renumbered ${preview.length} plots.`, "success");
      },
    });
  }, [project, selectedPlotIds, pushToHistory, persistProject, toast]);

  const handleSelectAll = useCallback(() => {
    if (!project) return;
    const visiblePlotIds = project.plots
      .filter((plot) => {
        const layerName = getPlotLayer(plot.status);
        return layers[layerName]?.visible;
      })
      .map((plot) => plot.id);

    const allSelected =
      visiblePlotIds.length > 0 && visiblePlotIds.every((pid) => selectedPlotIds.includes(pid));
    if (allSelected) {
      setSelectedPlotIds([]);
    } else {
      setSelectedPlotIds(visiblePlotIds);
    }
  }, [project, layers, getPlotLayer, selectedPlotIds]);

  const handleBulkDelete = useCallback(() => {
    if (!project || selectedPlotIds.length === 0) return;
    const count = selectedPlotIds.length;
    setInteraction({
      mode: "confirm",
      title: "Delete selected areas",
      description: `Are you sure you want to delete ${count} selected areas?`,
      confirmLabel: "Delete",
      confirmVariant: "danger",
      onConfirm: () => {
        pushToHistory();
        const updatedPlots = project.plots.filter(
          (p) => !selectedPlotIds.includes(p.id)
        );
        void persistProject({ ...project, plots: updatedPlots });
        setSelectedPlotIds([]);
        setMode("view");
      },
    });
  }, [project, selectedPlotIds, pushToHistory, persistProject]);

  const startDragVertex = useCallback(
    (idx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const plot = project?.plots.find((p) => p.id === activePlotId);
      const begin = () => {
        pushToHistory();
        setDraggedPointIdx(idx);
        setSelectedVertexIdx(idx);
      };
      withSoftLockConfirm(plot, begin);
    },
    [pushToHistory, project, activePlotId, withSoftLockConfirm]
  );

  const startTransform = useCallback((action: string, e: React.MouseEvent) => {
    if (!project) return;
    e.stopPropagation();
    pushToHistory();
    setTransformAction(action);
    const rawMouse = getSvgCoordinates(e);
    setTransformStartMouse(rawMouse);
    const plots = dragPreviewPlotsRef.current ?? project.plots;
    const plot = plots.find((p) => p.id === activePlotId);
    if (plot && plot.points) {
      setTransformStartPoints(plot.points.map((pt: [number, number]) => [pt[0], pt[1]] as [number, number]));
    }
  }, [project, activePlotId, getSvgCoordinates, pushToHistory]);

  const startDragLabel = useCallback((plot: Plot, e: React.MouseEvent) => {
    e.stopPropagation();
    pushToHistory();
    setDraggedLabelId(plot.id);
    const rawMouse = getSvgCoordinates(e);
    setTransformStartMouse(rawMouse);
    setDraggedLabelStartOffset(plot.labelOffset || { x: 0, y: 0 });
  }, [getSvgCoordinates, pushToHistory]);

  const insertPoint = useCallback((plotId: string, p1Idx: number, e: React.MouseEvent) => {
    if (!project) return;
    e.stopPropagation();
    const plots = dragPreviewPlotsRef.current ?? project.plots;
    const plot = plots.find((p) => p.id === plotId);
    if (!plot || !plot.points) return;
    const newPos = getSvgCoordinates(e);

    pushToHistory();
    const newPoints = [...plot.points];
    newPoints.splice(p1Idx + 1, 0, newPos);

    const updatedPlots = plots.map((p) =>
      p.id === plotId ? { ...p, points: newPoints } : p
    );
    // Preview now; mouseup flush persists (same as vertex drag).
    setDragPreview(updatedPlots);
    setEditingPlot((prev) => {
      if (!prev || prev.id !== plotId) return prev;
      return { ...prev, points: newPoints as [number, number][] };
    });
    setDraggedPointIdx(p1Idx + 1);
  }, [project, getSvgCoordinates, pushToHistory, setDragPreview]);

  const handleVertexManualEdit = useCallback((idx: number, coordIdx: number, val: number) => {
    if (isNaN(val) || !editingPlot || !editingPlot.points) return;
    const newPoints = editingPlot.points.map((pt: [number, number], i: number) => {
      if (i === idx) {
        const newPt = [...pt] as [number, number];
        newPt[coordIdx] = val;
        return newPt;
      }
      return pt;
    });
    setEditingPlot((prev: Plot | null) => {
      if (!prev) return null;
      return {
        ...prev,
        points: newPoints,
      };
    });
  }, [editingPlot]);

  const handleVertexManualDelete = useCallback((idx: number) => {
    if (!editingPlot || !editingPlot.points || editingPlot.points.length <= 3) return;
    const newPoints = editingPlot.points.filter((_: [number, number], i: number) => i !== idx);
    setEditingPlot((prev: Plot | null) => {
      if (!prev) return null;
      return {
        ...prev,
        points: newPoints,
      };
    });
  }, [editingPlot]);

  const handleSearchFocus = useCallback((number: string) => {
    if (!project) return;
    const plot = project.plots.find((p) => p.number.toLowerCase() === number.toLowerCase());
    if (plot) {
      setActivePlotId(plot.id);
      setEditingPlot({ ...plot, isNew: false, points: plot.points || [] });
      setPlotForm({
        number: plot.number || "",
        size: plot.size || "",
        rate: plot.rate || "",
        price: plot.price || "",
        status: plot.status,
        labelRotation: plot.labelRotation || 0,
      });
      setFlashPlotId(plot.id);
      setTimeout(() => setFlashPlotId(null), 3000);
    }
  }, [project]);

  return {
    svgRef,
    viewportRef,
    mapElementRef,
    mode,
    setMode,
    editSubMode,
    setEditSubMode,
    drawingPoints,
    setDrawingPoints,
    activePlotId,
    setActivePlotId,
    draggedPointIdx,
    setDraggedPointIdx,
    slicePoints,
    setSlicePoints,
    roadCutPoints,
    setRoadCutPoints,
    geometryPreview,
    setGeometryPreview,
    frontageForm,
    setFrontageForm,
    selectedVertexIdx,
    setSelectedVertexIdx,
    mousePos,
    setMousePos,
    editingPlot,
    setEditingPlot,
    plotForm,
    setPlotForm,
    subdivisionActive,
    setSubdivisionActive,
    subdivisionForm,
    setSubdivisionForm,
    selectedPlotIds,
    setSelectedPlotIds,
    showSettings,
    setShowSettings,
    bulkStatus,
    setBulkStatus,
    bulkRate,
    setBulkRate,
    freeSelectActive,
    setFreeSelectActive,
    isMouseDown,
    setIsMouseDown,
    history,
    uploadingImage,
    transformAction,
    setTransformAction,
    transformStartPoints,
    setTransformStartPoints,
    transformStartMouse,
    setTransformStartMouse,
    calibrationPoints,
    setCalibrationPoints,
    draggedLabelId,
    setDraggedLabelId,
    draggedLabelStartOffset,
    setDraggedLabelStartOffset,
    layers,
    setLayers,
    searchQuery,
    setSearchQuery,
    flashPlotId,
    setFlashPlotId,
    mapTransform,
    setMapTransform,
    dragPreviewPlots,
    handleMapWheel,
    handleMapPanStart,
    handleMapPanMove,
    handleMapPanEnd,
    resetMapTransform,
    canUndo,
    canRedo,
    getBoundingBox,
    getCenter,
    getPlotLayer,
    getSvgCoordinates,
    pushToHistory,
    handleUndo,
    handleRedo,
    handleMapEditorImageUpload,
    handleRemoveMapImage,
    handleClearCalibration,
    calculatePolygonArea,
    handleEditShapeClick,
    handleFinishDrawing,
    executeSlice,
    executeCalibration,
    executeFrontageSplit,
    handleFinishRoadCut,
    handleBatchRenumber,
    confirmGeometryPreview,
    cancelGeometryPreview,
    handleSvgClick,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleMergePlots,
    handlePlotClick,
    handlePlotDoubleClick,
    handleSavePlot,
    handleDeletePlot,
    handleAutoCalculateSize,
    orthogonalizePlot,
    handleDuplicatePlot,
    executeSubdivision,
    handleSelectAll,
    handleBulkDelete,
    startTransform,
    startDragVertex,
    startDragLabel,
    insertPoint,
    handleVertexManualEdit,
    handleVertexManualDelete,
    handleSearchFocus,
    interaction,
    clearInteraction,
  };
}
