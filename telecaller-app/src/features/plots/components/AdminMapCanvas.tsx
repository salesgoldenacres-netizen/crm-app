import { Project, Plot } from "@/shared/types";
import {
  areaSqFt,
  formatPlotLabel,
} from "@/features/plots/utils/adminMapMetrics";
import type { GeometryPreviewState } from "@/features/plots/utils/adminMapEditorPrecision";

interface AdminMapCanvasProps {
  project: Project;
  layers: Record<string, { visible: boolean; locked: boolean }>;
  mode: string;
  editSubMode: string;
  activePlotId: string | null;
  flashPlotId: string | null;
  selectedPlotIds: string[];
  drawingPoints: [number, number][];
  slicePoints: [number, number][];
  calibrationPoints: [number, number][];
  roadCutPoints?: [number, number][];
  geometryPreview?: GeometryPreviewState | null;
  mousePos: [number, number] | null;
  draggedPointIdx: number | null;
  setDraggedPointIdx: (val: number | null) => void;
  draggedLabelId: string | null;
  isMouseDown: boolean;
  setIsMouseDown: (val: boolean) => void;
  mapTransform: { scale: number; x: number; y: number };
  freeSelectActive: boolean;
  setSelectedPlotIds: React.Dispatch<React.SetStateAction<string[]>>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  mapElementRef: React.RefObject<HTMLDivElement | null>;
  handlePlotClick: (plot: Plot, e: React.MouseEvent) => void;
  handlePlotDoubleClick: (plot: Plot, e: React.MouseEvent) => void;
  handleSvgClick: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
  startTransform: (action: string, e: React.MouseEvent) => void;
  startDragVertex?: (idx: number, e: React.MouseEvent) => void;
  insertPoint: (plotId: string, idx: number, e: React.MouseEvent) => void;
  startDragLabel: (plot: Plot, e: React.MouseEvent) => void;
  getCenter: (pts: [number, number][]) => { x: number; y: number };
  getBoundingBox: (pts: [number, number][]) => { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number; cx: number; cy: number };
  getPlotLayer: (status: string) => string;
}

export default function AdminMapCanvas({
  project,
  layers,
  mode,
  editSubMode,
  activePlotId,
  flashPlotId,
  selectedPlotIds,
  drawingPoints,
  slicePoints,
  calibrationPoints,
  roadCutPoints = [],
  geometryPreview = null,
  mousePos,
  draggedPointIdx,
  setDraggedPointIdx,
  draggedLabelId,
  isMouseDown,
  setIsMouseDown,
  mapTransform,
  freeSelectActive,
  setSelectedPlotIds,
  svgRef,
  mapElementRef,
  handlePlotClick,
  handlePlotDoubleClick,
  handleSvgClick,
  handleMouseMove,
  handleMouseUp,
  handleMouseLeave,
  startTransform,
  startDragVertex,
  insertPoint,
  startDragLabel,
  getCenter,
  getBoundingBox,
  getPlotLayer,
}: AdminMapCanvasProps) {
  const getCursor = () => {
    if (
      mode === "draw" ||
      mode === "slice" ||
      mode === "calibrate" ||
      mode === "roadCut"
    )
      return "cursor-crosshair";
    if (mode === "bulk") return freeSelectActive ? "cursor-cell" : "cursor-pointer";
    if (mode === "editLabels") return "cursor-move";
    if (mode === "view") return "cursor-grab";
    return "cursor-default";
  };

  const scale = project.scaleRatio || 0;
  const labelMode = project.labelContentMode || "number";

  // Area-only / calibrate distance HUD — no edge ft dimension labels.
  const hudText = (() => {
    if (!scale || !mousePos) return null;

    if (mode === "draw" && drawingPoints.length >= 2) {
      const pts = [...drawingPoints, mousePos] as [number, number][];
      const area = Math.round(
        areaSqFt(pts.length >= 3 ? pts : drawingPoints, scale)
      );
      return area > 0 ? `${area} sq ft` : null;
    }
    if (mode === "calibrate" && calibrationPoints.length === 1) {
      const a = calibrationPoints[0];
      const dist = Math.round(
        Math.hypot(mousePos[0] - a[0], mousePos[1] - a[1]) * scale
      );
      return `${dist} ft`;
    }
    if (mode === "editShape" && draggedPointIdx !== null && activePlotId) {
      const plot = project.plots.find((p) => p.id === activePlotId);
      if (plot?.points && plot.points.length >= 3) {
        return `${Math.round(areaSqFt(plot.points, scale))} sq ft`;
      }
    }
    return null;
  })();

  const getColorConfig = (
    status: string,
    isEditing: boolean,
    isSlicingActive: boolean,
    isBulkSelected: boolean
  ) => {
    let fill = "rgba(255, 255, 255, 0.2)";
    let stroke = "#ffffff";
    switch (status) {
      case "available":
        fill = "rgba(34, 197, 94, 0.4)";
        stroke = "#16a34a";
        break;
      case "sold":
        fill = "rgba(239, 68, 68, 0.4)";
        stroke = "#dc2626";
        break;
      case "reserved":
      case "booked":
        fill = "rgba(234, 179, 8, 0.4)";
        stroke = "#ca8a04";
        break;
      case "road":
        fill = "rgba(107, 114, 128, 0.4)";
        stroke = "#4b5563";
        break;
      case "market":
        fill = "rgba(59, 130, 246, 0.4)";
        stroke = "#2563eb";
        break;
      case "park":
        fill = "rgba(16, 185, 129, 0.4)";
        stroke = "#059669";
        break;
    }
    if (isEditing) {
      fill = "rgba(234, 179, 8, 0.4)";
      stroke = "#ca8a04";
    }
    if (isSlicingActive) {
      fill = "rgba(239, 68, 68, 0.5)";
      stroke = "#ef4444";
    }
    if (isBulkSelected) {
      fill = "rgba(99, 102, 241, 0.5)";
      stroke = "#6366f1";
    }
    return { fill, stroke };
  };

  return (
    <div
      ref={mapElementRef}
      className="relative inline-block shadow-2xl border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950/20"
      style={{
        transform: `translate(${mapTransform.x}px, ${mapTransform.y}px) scale(${mapTransform.scale})`,
        transformOrigin: "0 0",
        transition:
          isMouseDown ||
          draggedPointIdx !== null ||
          draggedLabelId !== null
            ? "none"
            : "transform 0.4s ease-in-out",
      }}
    >
      {/* Background Image layout layer — placeholder keeps size when image is cleared */}
      {project.image ? (
        <img
          src={project.image}
          alt="Layout"
          loading="lazy"
          decoding="async"
          className="block w-[1200px] max-w-none pointer-events-none"
          style={{
            transform: `translate(${project.bgX || 0}px, ${project.bgY || 0}px) scale(${project.bgScale || 1}) rotate(${project.bgRotate || 0}deg)`,
            transformOrigin: "top left",
            opacity: project.bgOpacity !== undefined ? project.bgOpacity : 1,
            transition: "opacity 0.2s",
          }}
        />
      ) : (
        <div
          className="block w-[1200px] aspect-[3/2] max-w-none bg-slate-100 dark:bg-slate-900 pointer-events-none"
          aria-hidden="true"
        />
      )}

      <svg
        ref={svgRef}
        onClick={handleSvgClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseDown={() => {
          if (mode === "bulk" && freeSelectActive) {
            setIsMouseDown(true);
          }
        }}
        className={`absolute inset-0 w-full h-full ${getCursor()}`}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Draw Existing Plots */}
        {(project.plots || []).map((plot) => {
          const layerName = getPlotLayer(plot.status);
          if (!layers[layerName]?.visible) return null;
          const pts = plot.points;
          if (!pts) return null;

          const isEditing = activePlotId === plot.id && mode === "editShape";
          const isSlicingActive = activePlotId === plot.id && mode === "slice";
          const isBulkSelected = selectedPlotIds.includes(plot.id);
          const isFlashed = flashPlotId === plot.id;

          const colors = getColorConfig(plot.status, isEditing, isSlicingActive, isBulkSelected);
          const center = getCenter(pts);
          const labelX = center.x + (plot.labelOffset?.x || 0);
          const labelY = center.y + (plot.labelOffset?.y || 0);
          const labelRot = plot.labelRotation || 0;
          const bbox = getBoundingBox(pts);

          return (
            <g key={plot.id}>
              <polygon
                points={pts.map((p: [number, number]) => `${p[0]},${p[1]}`).join(" ")}
                fill={colors.fill}
                stroke={isFlashed ? "#eab308" : colors.stroke}
                strokeWidth={
                  isFlashed
                    ? "0.6"
                    : isEditing
                      ? "0.3"
                      : isSlicingActive
                        ? "0.4"
                        : isBulkSelected
                          ? "0.35"
                          : "0.1"
                }
                onClick={(e) => handlePlotClick(plot, e)}
                onDoubleClick={(e) => handlePlotDoubleClick(plot, e)}
                onMouseEnter={() => {
                  if (mode === "bulk" && freeSelectActive && isMouseDown) {
                    setSelectedPlotIds((prev) =>
                      prev.includes(plot.id) ? prev : [...prev, plot.id]
                    );
                  }
                }}
                onMouseDown={(e) => {
                  if (mode === "bulk" && freeSelectActive) {
                    e.stopPropagation();
                    setIsMouseDown(true);
                    setSelectedPlotIds((prev) =>
                      prev.includes(plot.id) ? prev : [...prev, plot.id]
                    );
                  }
                }}
                className={`transition-all ${isFlashed ? "animate-pulse" : ""} ${
                  mode === "view" || mode === "bulk"
                    ? "cursor-pointer hover:stroke-white hover:stroke-[0.3]"
                    : mode === "slice" && !activePlotId
                      ? "cursor-pointer hover:fill-red-500/50"
                      : ""
                }`}
                vectorEffect="non-scaling-stroke"
                style={{
                  pointerEvents: mode === "slice" && activePlotId ? "none" : "auto",
                }}
              />

              {/* Text Label overlay */}
              {(layers.labels?.visible || mode === "editLabels") && plot.status !== "road" && (
                <g
                  className={mode === "editLabels" ? "cursor-move" : "pointer-events-none"}
                  onMouseDown={(e) => {
                    if (mode === "editLabels") {
                      startDragLabel(plot, e);
                    }
                  }}
                >
                  {mode === "editLabels" && (
                    <circle
                      cx={labelX}
                      cy={labelY}
                      r="0.6"
                      fill="rgba(16, 185, 129, 0.4)"
                      stroke="#10b981"
                      strokeWidth="0.05"
                    />
                  )}
                  {formatPlotLabel(plot, pts, scale, labelMode)
                    .split("\n")
                    .filter(Boolean)
                    .map((line, li, arr) => (
                      <text
                        key={`lbl-${li}`}
                        x={labelX}
                        y={labelY + (li - (arr.length - 1) / 2) * 1.15}
                        transform={`rotate(${labelRot}, ${labelX}, ${labelY})`}
                        fill="white"
                        fontSize={li === 0 ? "1.1" : "0.75"}
                        fontWeight="bold"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        className="select-none"
                        style={{
                          textShadow: "0 0 3px rgba(0,0,0,0.8)",
                          pointerEvents: "none",
                        }}
                      >
                        {line}
                      </text>
                    ))}
                </g>
              )}

              {/* Interactive Corner Vertex handles */}
              {isEditing && editSubMode === "vertices" && (
                <>
                  {pts.map((pt: [number, number], i: number) => {
                    const nextPt = pts[(i + 1) % pts.length] as [number, number];
                    return (
                      <line
                        key={`edge-${i}`}
                        x1={pt[0]}
                        y1={pt[1]}
                        x2={nextPt[0]}
                        y2={nextPt[1]}
                        stroke="transparent"
                        strokeWidth="1.5"
                        className="cursor-copy hover:stroke-indigo-400/50"
                        style={{ strokeDasharray: "0.2 0.2" }}
                        vectorEffect="non-scaling-stroke"
                        onMouseDown={(e) => insertPoint(plot.id, i, e)}
                      />
                    );
                  })}
                  {pts.map((pt: [number, number], i: number) => (
                    <g key={`pt-${i}`} className="group cursor-move">
                      <circle
                        cx={pt[0]}
                        cy={pt[1]}
                        r="0.38"
                        fill="rgba(99, 102, 241, 0.15)"
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        style={{ pointerEvents: "none" }}
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle
                        cx={pt[0]}
                        cy={pt[1]}
                        r="0.18"
                        fill="white"
                        stroke="#6366f1"
                        strokeWidth="0.06"
                        className="group-hover:fill-indigo-50 transition-all duration-150"
                        vectorEffect="non-scaling-stroke"
                        onMouseDown={(e) => {
                          if (startDragVertex) {
                            startDragVertex(i, e);
                          } else {
                            e.stopPropagation();
                            setDraggedPointIdx(i);
                          }
                        }}
                      />
                    </g>
                  ))}
                </>
              )}

              {/* Bounding box visual transforming handlers */}
              {isEditing && editSubMode === "transform" && bbox.width > 0 && (
                <g>
                  <rect
                    x={bbox.minX}
                    y={bbox.minY}
                    width={bbox.width}
                    height={bbox.height}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="0.08"
                    strokeDasharray="0.2 0.2"
                    className="cursor-move"
                    onMouseDown={(e) => startTransform("translate", e)}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={bbox.minX}
                    cy={bbox.minY}
                    r="0.18"
                    fill="white"
                    stroke="#6366f1"
                    strokeWidth="0.06"
                    className="cursor-nwse-resize hover:fill-indigo-50"
                    onMouseDown={(e) => startTransform("scale-tl", e)}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={bbox.maxX}
                    cy={bbox.minY}
                    r="0.18"
                    fill="white"
                    stroke="#6366f1"
                    strokeWidth="0.06"
                    className="cursor-nesw-resize hover:fill-indigo-50"
                    onMouseDown={(e) => startTransform("scale-tr", e)}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={bbox.minX}
                    cy={bbox.maxY}
                    r="0.18"
                    fill="white"
                    stroke="#6366f1"
                    strokeWidth="0.06"
                    className="cursor-nesw-resize hover:fill-indigo-50"
                    onMouseDown={(e) => startTransform("scale-bl", e)}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={bbox.maxX}
                    cy={bbox.maxY}
                    r="0.18"
                    fill="white"
                    stroke="#6366f1"
                    strokeWidth="0.06"
                    className="cursor-nwse-resize hover:fill-indigo-50"
                    onMouseDown={(e) => startTransform("scale-br", e)}
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* Rotate Handle */}
                  <line
                    x1={bbox.cx}
                    y1={bbox.minY}
                    x2={bbox.cx}
                    y2={bbox.minY - 1.2}
                    stroke="#6366f1"
                    strokeWidth="0.05"
                    strokeDasharray="0.1 0.1"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={bbox.cx}
                    cy={bbox.minY - 1.2}
                    r="0.2"
                    fill="#6366f1"
                    stroke="white"
                    strokeWidth="0.06"
                    className="cursor-alias hover:fill-indigo-700"
                    onMouseDown={(e) => startTransform("rotate", e)}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* Geometry confirm preview fills */}
        {geometryPreview &&
          geometryPreview.rings.map((ring, idx) => {
            const c = getCenter(ring);
            const areaTxt =
              geometryPreview.areasFt[idx] > 0
                ? `${geometryPreview.areasFt[idx]} sq ft`
                : "";
            return (
              <g key={`preview-${idx}`} className="pointer-events-none">
                <polygon
                  points={ring.map((p) => `${p[0]},${p[1]}`).join(" ")}
                  fill="rgba(244, 63, 94, 0.2)"
                  stroke="#f43f5e"
                  strokeWidth="0.12"
                  strokeDasharray="0.3 0.3"
                  vectorEffect="non-scaling-stroke"
                />
                {areaTxt && (
                  <text
                    x={c.x}
                    y={c.y}
                    fill="#4f46e5"
                    fontSize="0.65"
                    fontWeight="black"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {areaTxt}
                  </text>
                )}
              </g>
            );
          })}
        {geometryPreview?.roadRing && (
          <polygon
            points={geometryPreview.roadRing
              .map((p) => `${p[0]},${p[1]}`)
              .join(" ")}
            fill="rgba(107, 114, 128, 0.35)"
            stroke="#4b5563"
            strokeWidth="0.12"
            className="pointer-events-none"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Dynamic drawing preview lines */}
        {drawingPoints.length > 0 && (
          <>
            <polygon
              points={drawingPoints.map((p) => `${p[0]},${p[1]}`).join(" ")}
              fill="rgba(16, 185, 129, 0.15)"
              stroke="#10b981"
              strokeWidth="0.12"
              vectorEffect="non-scaling-stroke"
            />
            {drawingPoints.map((pt, i) => (
              <circle
                key={i}
                cx={pt[0]}
                cy={pt[1]}
                r="0.18"
                fill="white"
                stroke="#10b981"
                strokeWidth="0.06"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {mode === "draw" && mousePos && drawingPoints.length > 0 && (
              <line
                x1={drawingPoints[drawingPoints.length - 1][0]}
                y1={drawingPoints[drawingPoints.length - 1][1]}
                x2={mousePos[0]}
                y2={mousePos[1]}
                stroke="#10b981"
                strokeWidth="0.1"
                strokeDasharray="0.3 0.3"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </>
        )}

        {/* Slice line preview */}
        {mode === "slice" && activePlotId && (
          <>
            {slicePoints.length === 1 && mousePos && (
              <line
                x1={slicePoints[0][0]}
                y1={slicePoints[0][1]}
                x2={mousePos[0]}
                y2={mousePos[1]}
                stroke="#f43f5e"
                strokeWidth="0.12"
                strokeDasharray="0.3 0.3"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {slicePoints.map((pt, i) => (
              <circle
                key={i}
                cx={pt[0]}
                cy={pt[1]}
                r="0.18"
                fill="white"
                stroke="#f43f5e"
                strokeWidth="0.06"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </>
        )}

        {/* Road cut centerline */}
        {mode === "roadCut" && (
          <>
            {roadCutPoints.length > 0 && (
              <polyline
                points={[
                  ...roadCutPoints,
                  ...(mousePos ? [mousePos] : []),
                ]
                  .map((p) => `${p[0]},${p[1]}`)
                  .join(" ")}
                fill="none"
                stroke="#4b5563"
                strokeWidth="0.14"
                strokeDasharray="0.3 0.3"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {roadCutPoints.map((pt, i) => (
              <circle
                key={`r-${i}`}
                cx={pt[0]}
                cy={pt[1]}
                r="0.18"
                fill="white"
                stroke="#4b5563"
                strokeWidth="0.06"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </>
        )}

        {/* Calibration line preview */}
        {mode === "calibrate" && calibrationPoints.length === 1 && mousePos && (
          <>
            <line
              x1={calibrationPoints[0][0]}
              y1={calibrationPoints[0][1]}
              x2={mousePos[0]}
              y2={mousePos[1]}
              stroke="#eab308"
              strokeWidth="0.12"
              strokeDasharray="0.3 0.3"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={calibrationPoints[0][0]}
              cy={calibrationPoints[0][1]}
              r="0.18"
              fill="white"
              stroke="#eab308"
              strokeWidth="0.06"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}

        {/* Live area / calibrate HUD near cursor */}
        {hudText && mousePos && (
          <g className="pointer-events-none opacity-90">
            {(() => {
              const badgeW = hudText.length * 0.42 + 0.5;
              const badgeH = 1.1;
              const x = mousePos[0] + 1.2;
              const y = mousePos[1] - 1.2;
              return (
                <>
                  <rect
                    x={x - badgeW / 2}
                    y={y - badgeH / 2}
                    width={badgeW}
                    height={badgeH}
                    rx="0.2"
                    ry="0.2"
                    fill="white"
                    stroke="#6366f1"
                    strokeWidth="0.04"
                  />
                  <text
                    x={x}
                    y={y + 0.05}
                    fill="#4f46e5"
                    fontSize="0.65"
                    fontWeight="black"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {hudText}
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>
    </div>
  );
}
