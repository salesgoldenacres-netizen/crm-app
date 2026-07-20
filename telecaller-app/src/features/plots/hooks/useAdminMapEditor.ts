import { useState, useRef, useEffect, useCallback } from "react";
import polygonClipping from "polygon-clipping";
import { Project, Plot, EditingPlot } from "@/shared/types";
import { logAnalyticsEvent } from "@/shared/utils/analytics";
import { logger } from "@/shared/utils/logger";
import { uploadFile } from "@/shared/utils/uploadFile";
import { useToast } from "@/shared/components/Toast";
import type { InteractionDialogState } from "@/shared/components/ui/InteractionDialog";

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

  const [editingPlot, setEditingPlot] = useState<EditingPlot | null>(null);
  const [plotForm, setPlotForm] = useState({
    number: "",
    size: "",
    rate: "",
    price: "",
    status: "available",
    labelRotation: 0,
  });

  const [snapToGrid, setSnapToGrid] = useState(false);
  const [snapToGeometry, setSnapToGeometry] = useState(true);
  const [snapTolerancePx, setSnapTolerancePx] = useState(10);
  const [subdivisionActive, setSubdivisionActive] = useState(false);
  const [subdivisionForm, setSubdivisionForm] = useState({
    mode: "count",
    count: 2,
    targetSize: 1000,
    direction: "vertical",
    method: "area",
  });
  const [gridSize] = useState(0.5);
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);
  const [snappedPoint, setSnappedPoint] = useState<[number, number] | null>(null);
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

  // Layers
  const [layers, setLayers] = useState<Record<string, { visible: boolean; locked: boolean }>>({
    plots: { visible: true, locked: false },
    roads: { visible: true, locked: false },
    amenities: { visible: true, locked: false },
    labels: { visible: false, locked: false },
  });

  // Search & Flash
  const [searchQuery, setSearchQuery] = useState("");
  const [flashPlotId, setFlashPlotId] = useState<string | null>(null);
  const [mapTransform, setMapTransform] = useState({ scale: 1, x: 0, y: 0 });

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

  // Snap plot helper
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

  // Snapping engine
  const getSnappedCoordinates = useCallback(
    (rawCoords: [number, number], e?: { shiftKey?: boolean }, referencePoint?: [number, number] | null): [number, number] => {
      let [x, y] = rawCoords;
      setSnappedPoint(null);

      // Angle Snapping
      if (e && e.shiftKey && referencePoint) {
        const [rx, ry] = referencePoint;
        const dx = x - rx;
        const dy = y - ry;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.05) {
          const angle = Math.atan2(dy, dx);
          const angleDeg = angle * (180 / Math.PI);
          const snappedAngleDeg = Math.round(angleDeg / 15) * 15;
          const snappedAngleRad = snappedAngleDeg * (Math.PI / 180);
          x = rx + dist * Math.cos(snappedAngleRad);
          y = ry + dist * Math.sin(snappedAngleRad);
        }
      }

      // Geometry Snapping
      if (snapToGeometry && project?.plots) {
        const snapToleranceSvg = snapTolerancePx / 12;
        const candidates: { pt: [number, number]; plotId: string }[] = [];

        project.plots.forEach((plot) => {
          const layerName = getPlotLayer(plot.status);
          if (!layers[layerName]?.visible) return;
          const isCurrentActive = plot.id === activePlotId;

          if (plot.points) {
            plot.points.forEach((pt: [number, number], ptIdx: number) => {
              if (isCurrentActive && ptIdx === draggedPointIdx) return;
              candidates.push({ pt, plotId: plot.id });
            });
          }
        });

        // Vertex check
        let closestVertex: [number, number] | null = null;
        let minVertexDist = snapToleranceSvg;

        candidates.forEach((c) => {
          const d = Math.sqrt((x - c.pt[0]) ** 2 + (y - c.pt[1]) ** 2);
          if (d < minVertexDist) {
            minVertexDist = d;
            closestVertex = c.pt;
          }
        });

        if (closestVertex) {
          setSnappedPoint(closestVertex);
          return closestVertex;
        }

        // Edge check
        let closestEdgePoint: [number, number] | null = null;
        let minEdgeDist = snapToleranceSvg;

        const getClosestPointOnSegment = (
          A: [number, number],
          B: [number, number],
          P: [number, number]
        ): [number, number] => {
          const [ax, ay] = A;
          const [bx, by] = B;
          const [px, py] = P;
          const abx = bx - ax;
          const aby = by - ay;
          const ab2 = abx * abx + aby * aby;
          if (ab2 === 0) return A;
          let t = ((px - ax) * abx + (py - ay) * aby) / ab2;
          t = Math.max(0, Math.min(1, t));
          return [ax + t * abx, ay + t * aby];
        };

        project.plots.forEach((plot) => {
          const layerName = getPlotLayer(plot.status);
          if (!layers[layerName]?.visible) return;
          if (plot.id === activePlotId) return;

          const pts = plot.points as [number, number][] | undefined;
          if (!pts) return;
          const n = pts.length;
          for (let i = 0; i < n; i++) {
            const closest = getClosestPointOnSegment(pts[i], pts[(i + 1) % n], [x, y]);
            const d = Math.sqrt((x - closest[0]) ** 2 + (y - closest[1]) ** 2);
            if (d < minEdgeDist) {
              minEdgeDist = d;
              closestEdgePoint = closest;
            }
          }
        });

        if (closestEdgePoint) {
          setSnappedPoint(closestEdgePoint);
          return closestEdgePoint;
        }
      }

      // Grid Snapping
      if (snapToGrid) {
        x = Math.round(x / gridSize) * gridSize;
        y = Math.round(y / gridSize) * gridSize;
        setSnappedPoint([x, y]);
        return [x, y];
      }

      return [x, y];
    },
    [snapToGrid, snapToGeometry, snapTolerancePx, project, activePlotId, draggedPointIdx, getPlotLayer, layers, gridSize]
  );

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
    if (history.past.length === 0 || !project) return;
    const previousState = history.past[history.past.length - 1];
    setHistory((prev) => {
      const newPast = [...prev.past];
      newPast.pop();
      return {
        past: newPast,
        future: [JSON.parse(JSON.stringify(project.plots)), ...prev.future].slice(0, 50),
      };
    });
    updateProject(projectId, { ...project, plots: previousState });
  }, [history.past, project, projectId, updateProject]);

  const handleRedo = useCallback(() => {
    if (history.future.length === 0 || !project) return;
    const nextState = history.future[0];
    setHistory((prev) => {
      const newFuture = [...prev.future];
      newFuture.shift();
      return {
        past: [...prev.past, JSON.parse(JSON.stringify(project.plots))].slice(-50),
        future: newFuture,
      };
    });
    updateProject(projectId, { ...project, plots: nextState });
  }, [history.future, project, projectId, updateProject]);

  // File uploading layout
  const handleMapEditorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    setUploadingImage(true);
    try {
      const downloadUrl = await uploadFile("layouts", file);

      await updateProject(projectId, { ...project, image: downloadUrl });
      toast("Layout image updated successfully!", "success");
    } catch (err: unknown) {
      logger.error("AdminMapEditor", "Image upload failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      toast("Failed to upload image: " + msg, "error");
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
    setMode("editShape");
    setEditSubMode("vertices");
  }, []);

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

  const executeSlice = useCallback((p1: [number, number], p2: [number, number]) => {
    if (!project) return;
    const plot = project.plots.find((p) => p.id === activePlotId);
    if (!plot || !plot.points) return;

    try {
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 0.1) {
        setSlicePoints([]);
        return;
      }

      const nx = (-dy / length) * 500;
      const ny = (dx / length) * 500;

      const extStart: [number, number] = [p1[0] - dx * 10, p1[1] - dy * 10];
      const extEnd: [number, number] = [p2[0] + dx * 10, p2[1] + dy * 10];

      const leftBox: [number, number][] = [
        extStart,
        extEnd,
        [extEnd[0] + nx, extEnd[1] + ny],
        [extStart[0] + nx, extStart[1] + ny],
      ];
      const rightBox: [number, number][] = [
        extStart,
        extEnd,
        [extEnd[0] - nx, extEnd[1] - ny],
        [extStart[0] - nx, extStart[1] - ny],
      ];

      const toClippingFormat = (pts: [number, number][]) => [[...pts, pts[0]]];
      const targetGeom = [toClippingFormat(plot.points as [number, number][])];
      const leftGeom = [toClippingFormat(leftBox)];
      const rightGeom = [toClippingFormat(rightBox)];

      const leftRes = polygonClipping.intersection(
        targetGeom as unknown as Parameters<typeof polygonClipping.intersection>[0],
        leftGeom as unknown as Parameters<typeof polygonClipping.intersection>[0]
      );
      const rightRes = polygonClipping.intersection(
        targetGeom as unknown as Parameters<typeof polygonClipping.intersection>[0],
        rightGeom as unknown as Parameters<typeof polygonClipping.intersection>[0]
      );

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

      const newLeftRings = extractRings(leftRes);
      const newRightRings = extractRings(rightRes);
      const allNewRings = [...newLeftRings, ...newRightRings];

      if (allNewRings.length >= 2) {
        pushToHistory();
        const updatedPlots = project.plots.filter((p) => p.id !== activePlotId);

        allNewRings.forEach((ring: [number, number][], idx: number) => {
          updatedPlots.push({
            ...plot,
            id: `${Date.now()}-${idx}`,
            points: ring,
            number: "",
          });
        });

        updateProject(projectId, { ...project, plots: updatedPlots });
      }
    } catch (err) {
      logger.error("AdminMapEditor", "Slice failed:", err);
      toast("Could not slice polygon cleanly. Try adjusting your line.", "error");
    }

    setSlicePoints([]);
    setActivePlotId(null);
  }, [project, activePlotId, projectId, updateProject, pushToHistory, toast]);

  const executeCalibration = useCallback((p1: [number, number], p2: [number, number]) => {
    if (!project) return;
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);

    if (pixelDistance < 0.5) {
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
      onConfirm: (realFeet) => {
        const parsedFeet = parseFloat(realFeet || "");
        if (isNaN(parsedFeet) || parsedFeet <= 0) {
          toast("Invalid length entered.", "error");
          setCalibrationPoints([]);
          return;
        }
        const scaleRatio = parsedFeet / pixelDistance;
        void updateProject(projectId, { ...project, scaleRatio });
        setCalibrationPoints([]);
        setMode("view");
        toast(
          `Calibration complete! Scale Ratio: ${scaleRatio.toFixed(3)} ft/unit.`,
          "success"
        );
      },
    });
  }, [project, projectId, updateProject, toast]);

  const handleSvgClick = useCallback((e: React.MouseEvent) => {
    const rawCoords = getSvgCoordinates(e);
    const referencePoint =
      mode === "draw" && drawingPoints.length > 0
        ? drawingPoints[drawingPoints.length - 1]
        : undefined;
    const snapped = getSnappedCoordinates(rawCoords, e, referencePoint);

    if (mode === "draw") {
      setDrawingPoints([...drawingPoints, snapped]);
    } else if (mode === "slice" && activePlotId) {
      if (slicePoints.length === 0) {
        setSlicePoints([snapped]);
      } else if (slicePoints.length === 1) {
        executeSlice(slicePoints[0], snapped);
      }
    } else if (mode === "calibrate") {
      if (calibrationPoints.length === 0) {
        setCalibrationPoints([snapped]);
      } else if (calibrationPoints.length === 1) {
        executeCalibration(calibrationPoints[0], snapped);
      }
    }
  }, [mode, drawingPoints, slicePoints, calibrationPoints, activePlotId, getSvgCoordinates, getSnappedCoordinates, executeSlice, executeCalibration]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!project) return;
    const rawPos = getSvgCoordinates(e);

    let referencePoint: [number, number] | null = null;
    if (mode === "draw" && drawingPoints.length > 0) {
      referencePoint = drawingPoints[drawingPoints.length - 1];
    } else if (mode === "editShape" && activePlotId && draggedPointIdx !== null) {
      const activePlot = project?.plots?.find((p) => p.id === activePlotId);
      if (activePlot && activePlot.points) {
        const pts = activePlot.points as [number, number][];
        const prevIdx = (draggedPointIdx - 1 + pts.length) % pts.length;
        referencePoint = pts[prevIdx];
      }
    }

    const snappedPos = getSnappedCoordinates(rawPos, e, referencePoint);

    if (mode === "slice" && activePlotId) {
      setMousePos(snappedPos);
    } else if (mode === "calibrate" && calibrationPoints.length === 1) {
      setMousePos(snappedPos);
    } else if (draggedPointIdx !== null && activePlotId && editSubMode === "vertices") {
      const updatedPlots = project.plots.map((p) => {
        if (p.id === activePlotId && p.points) {
          const newPoints = [...p.points];
          newPoints[draggedPointIdx] = snappedPos;
          return { ...p, points: newPoints };
        }
        return p;
      });
      updateProject(projectId, { ...project, plots: updatedPlots });
    } else if (transformAction && activePlotId && editSubMode === "transform") {
      const startBbox = getBoundingBox(transformStartPoints);
      let updatedPoints = [...transformStartPoints];

      if (transformAction === "translate" && transformStartMouse) {
        const dx = snappedPos[0] - transformStartMouse[0];
        const dy = snappedPos[1] - transformStartMouse[1];
        updatedPoints = transformStartPoints.map((pt) => [pt[0] + dx, pt[1] + dy]);
      } else if (transformAction === "rotate" && transformStartMouse) {
        const cx = startBbox.cx;
        const cy = startBbox.cy;
        const angleStart = Math.atan2(transformStartMouse[1] - cy, transformStartMouse[0] - cx);
        const angleCurrent = Math.atan2(snappedPos[1] - cy, snappedPos[0] - cx);
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
          scaleX = (snappedPos[0] - cx) / (transformStartMouse[0] - cx);
          scaleY = (snappedPos[1] - cy) / (transformStartMouse[1] - cy);
        } else if (transformAction === "scale-tl") {
          scaleX = (snappedPos[0] - cx) / (transformStartMouse[0] - cx);
          scaleY = (snappedPos[1] - cy) / (transformStartMouse[1] - cy);
        } else if (transformAction === "scale-tr") {
          scaleX = (snappedPos[0] - cx) / (transformStartMouse[0] - cx);
          scaleY = (snappedPos[1] - cy) / (transformStartMouse[1] - cy);
        } else if (transformAction === "scale-bl") {
          scaleX = (snappedPos[0] - cx) / (transformStartMouse[0] - cx);
          scaleY = (snappedPos[1] - cy) / (transformStartMouse[1] - cy);
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

      const updatedPlots = project.plots.map((p) =>
        p.id === activePlotId ? { ...p, points: updatedPoints } : p
      );
      updateProject(projectId, { ...project, plots: updatedPlots });
    } else if (draggedLabelId && mode === "editLabels" && transformStartMouse) {
      const dx = snappedPos[0] - transformStartMouse[0];
      const dy = snappedPos[1] - transformStartMouse[1];

      const updatedPlots = project.plots.map((p) => {
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
      updateProject(projectId, { ...project, plots: updatedPlots });
    } else if (mode === "draw" || mode === "slice" || mode === "calibrate") {
      setMousePos(snappedPos);
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
    drawingPoints,
    getSvgCoordinates,
    getSnappedCoordinates,
    getBoundingBox,
    updateProject,
    projectId,
  ]);

  const handleMouseUp = useCallback(() => {
    setDraggedPointIdx(null);
    setTransformAction(null);
    setDraggedLabelId(null);
    setIsMouseDown(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setDraggedPointIdx(null);
    setTransformAction(null);
    setDraggedLabelId(null);
    setMousePos(null);
    setSnappedPoint(null);
    setIsMouseDown(false);
  }, []);

  const handleMergePlots = useCallback(() => {
    if (!project || selectedPlotIds.length < 2) return;
    const selectedPlots = project.plots.filter((p) => selectedPlotIds.includes(p.id));

    try {
      const toClippingFormat = (pts: [number, number][]) => [[...pts, pts[0]]];
      let currentGeom = [toClippingFormat(selectedPlots[0].points as [number, number][])];

      for (let i = 1; i < selectedPlots.length; i++) {
        currentGeom = polygonClipping.union(
          currentGeom as unknown as Parameters<typeof polygonClipping.union>[0],
          [toClippingFormat(selectedPlots[i].points as [number, number][])] as unknown as Parameters<typeof polygonClipping.union>[0]
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
        const updatedPlots = project.plots.filter((p) => !selectedPlotIds.includes(p.id));

        const combinedNumber = selectedPlots
          .map((p) => p.number)
          .filter(Boolean)
          .join("+");
        const combinedSize = selectedPlots.reduce((sum, p) => sum + (parseFloat(p.size) || 0), 0);
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

        updateProject(projectId, { ...project, plots: updatedPlots });
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
  }, [project, selectedPlotIds, pushToHistory, updateProject, projectId, toast]);

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
    pushToHistory();
    let updatedPlots = [...project.plots];

    if (editingPlot.isNew) {
      updatedPlots.push({
        id: Date.now().toString(),
        points: editingPlot.points,
        ...plotForm,
      });
    } else {
      updatedPlots = updatedPlots.map((p) =>
        p.id === editingPlot.id ? { ...p, ...plotForm } : p
      );
    }

    updateProject(projectId, { ...project, plots: updatedPlots });
    setEditingPlot(null);
    setDrawingPoints([]);
    setMode("view");
  }, [project, editingPlot, plotForm, pushToHistory, updateProject, projectId]);

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
        void updateProject(projectId, { ...project, plots: updatedPlots });
        setEditingPlot(null);
        if (activePlotId === editingPlot.id) {
          setActivePlotId(null);
          setMode("view");
        }
      },
    });
  }, [editingPlot, project, activePlotId, pushToHistory, updateProject, projectId]);

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
    updateProject(projectId, { ...project, plots: updatedPlots });
  }, [project, projectId, updateProject, pushToHistory, toast]);

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
    updateProject(projectId, { ...project, plots: updatedPlots });
    setActivePlotId(newId);
    setMode("editShape");
    setEditSubMode("transform");
    setEditingPlot(null);
  }, [project, projectId, updateProject, pushToHistory]);

  const executeSubdivision = useCallback(() => {
    if (!project) return;
    const plot = project.plots.find((p) => p.id === activePlotId);
    if (!plot || !plot.points) return;

    const { mode: subMode, count, targetSize, direction, method } = subdivisionForm;
    let N = parseInt(count as unknown as string);

    if (subMode === "size") {
      const totalArea = calculatePolygonArea(plot.points as [number, number][], project.scaleRatio);
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
      pushToHistory();
      const bbox = getBoundingBox(plot.points as [number, number][]);

      const cuts: number[] = [];
      const getAreaToLeftOfX = (polyPoints: [number, number][], xCoord: number) => {
        const leftBox = [
          [-100, -100],
          [xCoord, -100],
          [xCoord, 200],
          [-100, 200],
        ];
        try {
          const res = polygonClipping.intersection(
            [[...polyPoints, polyPoints[0]]] as unknown as Parameters<typeof polygonClipping.intersection>[0],
            [leftBox] as unknown as Parameters<typeof polygonClipping.intersection>[0]
          );
          let area = 0;
          if (res) {
            for (const multiPoly of res) {
              for (const poly of multiPoly) {
                if (poly.length > 3) {
                  let sum = 0;
                  const pts = poly.slice(0, -1);
                  const n = pts.length;
                  for (let j = 0; j < n; j++) {
                    sum += pts[j][0] * pts[(j + 1) % n][1] - pts[(j + 1) % n][0] * pts[j][1];
                  }
                  area += Math.abs(sum) / 2;
                }
              }
            }
          }
          return area;
        } catch {
          return 0;
        }
      };

      const getAreaToTopOfY = (polyPoints: [number, number][], yCoord: number) => {
        const topBox = [
          [-100, -100],
          [200, -100],
          [200, yCoord],
          [-100, yCoord],
        ];
        try {
          const res = polygonClipping.intersection(
            [[...polyPoints, polyPoints[0]]] as unknown as Parameters<typeof polygonClipping.intersection>[0],
            [topBox] as unknown as Parameters<typeof polygonClipping.intersection>[0]
          );
          let area = 0;
          if (res) {
            for (const multiPoly of res) {
              for (const poly of multiPoly) {
                if (poly.length > 3) {
                  let sum = 0;
                  const pts = poly.slice(0, -1);
                  const n = pts.length;
                  for (let j = 0; j < n; j++) {
                    sum += pts[j][0] * pts[(j + 1) % n][1] - pts[(j + 1) % n][0] * pts[j][1];
                  }
                  area += Math.abs(sum) / 2;
                }
              }
            }
          }
          return area;
        } catch {
          return 0;
        }
      };

      if (method === "spacing") {
        if (direction === "vertical") {
          const step = bbox.width / N;
          for (let i = 1; i < N; i++) {
            cuts.push(bbox.minX + i * step);
          }
        } else {
          const step = bbox.height / N;
          for (let i = 1; i < N; i++) {
            cuts.push(bbox.minY + i * step);
          }
        }
      } else {
        const totalArea = calculatePolygonArea(plot.points as [number, number][], null);
        const targetFraction = totalArea / N;

        if (direction === "vertical") {
          for (let i = 1; i < N; i++) {
            const targetLeftArea = targetFraction * i;
            let low = bbox.minX;
            let high = bbox.maxX;
            for (let iter = 0; iter < 18; iter++) {
              const mid = (low + high) / 2;
              const currentLeftArea = getAreaToLeftOfX(plot.points as [number, number][], mid);
              if (currentLeftArea < targetLeftArea) {
                low = mid;
              } else {
                high = mid;
              }
            }
            cuts.push((low + high) / 2);
          }
        } else {
          for (let i = 1; i < N; i++) {
            const targetTopArea = targetFraction * i;
            let low = bbox.minY;
            let high = bbox.maxY;
            for (let iter = 0; iter < 18; iter++) {
              const mid = (low + high) / 2;
              const currentTopArea = getAreaToTopOfY(plot.points as [number, number][], mid);
              if (currentTopArea < targetTopArea) {
                low = mid;
              } else {
                high = mid;
              }
            }
            cuts.push((low + high) / 2);
          }
        }
      }

      let currentPolys: { points: [number, number][]; id?: string }[] = [{ points: plot.points, id: plot.id }];
      const toClippingFormat = (pts: [number, number][]) => [[...pts, pts[0]]];
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

      cuts.sort((a, b) => a - b);

      for (const cutVal of cuts) {
        const nextPolys: { points: [number, number][]; id?: string }[] = [];
        let slicedAny = false;

        for (const poly of currentPolys) {
          const polyBbox = getBoundingBox(poly.points);
          const inRange =
            direction === "vertical"
              ? cutVal > polyBbox.minX && cutVal < polyBbox.maxX
              : cutVal > polyBbox.minY && cutVal < polyBbox.maxY;

          if (inRange && !slicedAny) {
            let leftBox: [number, number][], rightBox: [number, number][];
            if (direction === "vertical") {
              leftBox = [
                [-100, -100],
                [cutVal, -100],
                [cutVal, 200],
                [-100, 200],
              ];
              rightBox = [
                [cutVal, -100],
                [200, -100],
                [200, 200],
                [cutVal, 200],
              ];
            } else {
              leftBox = [
                [-100, -100],
                [200, -100],
                [200, cutVal],
                [-100, cutVal],
              ];
              rightBox = [
                [-100, cutVal],
                [200, cutVal],
                [200, 200],
                [-100, 200],
              ];
            }

            const leftIntersection = polygonClipping.intersection(
              [toClippingFormat(poly.points)] as unknown as Parameters<typeof polygonClipping.intersection>[0],
              [leftBox] as unknown as Parameters<typeof polygonClipping.intersection>[0]
            );
            const rightIntersection = polygonClipping.intersection(
              [toClippingFormat(poly.points)] as unknown as Parameters<typeof polygonClipping.intersection>[0],
              [rightBox] as unknown as Parameters<typeof polygonClipping.intersection>[0]
            );

            const leftRings = extractRings(leftIntersection);
            const rightRings = extractRings(rightIntersection);

            if (leftRings.length > 0 || rightRings.length > 0) {
              leftRings.forEach((ring) => nextPolys.push({ points: ring }));
              rightRings.forEach((ring) => nextPolys.push({ points: ring }));
              slicedAny = true;
            } else {
              nextPolys.push(poly);
            }
          } else {
            nextPolys.push(poly);
          }
        }
        currentPolys = nextPolys;
      }

      if (currentPolys.length >= 2) {
        const updatedPlots = project.plots.filter((p) => p.id !== activePlotId);

        currentPolys.forEach((poly: { points: [number, number][]; id?: string }, idx: number) => {
          const charSuffix = String.fromCharCode(65 + idx);
          const newNumber = plot.number ? `${plot.number}${charSuffix}` : `${charSuffix}`;
          const newSize = calculatePolygonArea(poly.points, project.scaleRatio);
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
            points: poly.points,
          });
        });

        updateProject(projectId, { ...project, plots: updatedPlots });
        setEditingPlot(null);
        setActivePlotId(null);
        setSubdivisionActive(false);
        setMode("view");
        toast(
          `Plot subdivided successfully into ${currentPolys.length} parts!`,
          "success"
        );
      } else {
        toast("Failed to divide plot geometry cleanly.", "error");
      }
    } catch (err) {
      logger.error("AdminMapEditor", "Subdivision failed:", err);
      toast(
        "An error occurred during subdivision clipping. Please try different parameters.",
        "error"
      );
    }
  }, [project, activePlotId, subdivisionForm, calculatePolygonArea, getBoundingBox, pushToHistory, updateProject, projectId, toast]);

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
        void updateProject(projectId, { ...project, plots: updatedPlots });
        setSelectedPlotIds([]);
        setMode("view");
      },
    });
  }, [project, selectedPlotIds, pushToHistory, updateProject, projectId]);

  const startTransform = useCallback((action: string, e: React.MouseEvent) => {
    if (!project) return;
    e.stopPropagation();
    pushToHistory();
    setTransformAction(action);
    const rawMouse = getSvgCoordinates(e);
    setTransformStartMouse(rawMouse);
    const plot = project.plots.find((p) => p.id === activePlotId);
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
    const plot = project.plots.find((p) => p.id === plotId);
    if (!plot || !plot.points) return;
    const newPos = getSvgCoordinates(e);

    pushToHistory();
    const newPoints = [...plot.points];
    newPoints.splice(p1Idx + 1, 0, newPos);

    const updatedPlots = project.plots.map((p) =>
      p.id === plotId ? { ...p, points: newPoints } : p
    );
    updateProject(projectId, { ...project, plots: updatedPlots });
    setDraggedPointIdx(p1Idx + 1);
  }, [project, getSvgCoordinates, pushToHistory, updateProject, projectId]);

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
    mousePos,
    setMousePos,
    editingPlot,
    setEditingPlot,
    plotForm,
    setPlotForm,
    snapToGrid,
    setSnapToGrid,
    snapToGeometry,
    setSnapToGeometry,
    snapTolerancePx,
    setSnapTolerancePx,
    subdivisionActive,
    setSubdivisionActive,
    subdivisionForm,
    setSubdivisionForm,
    selectedPlotIds,
    setSelectedPlotIds,
    snappedPoint,
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
    getBoundingBox,
    getCenter,
    getPlotLayer,
    getSvgCoordinates,
    getSnappedCoordinates,
    pushToHistory,
    handleUndo,
    handleRedo,
    handleMapEditorImageUpload,
    calculatePolygonArea,
    handleEditShapeClick,
    handleFinishDrawing,
    executeSlice,
    executeCalibration,
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
    startDragLabel,
    insertPoint,
    handleVertexManualEdit,
    handleVertexManualDelete,
    handleSearchFocus,
    interaction,
    clearInteraction,
  };
}
