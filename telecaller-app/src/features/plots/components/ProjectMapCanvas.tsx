import React from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize, Eye, EyeOff } from "lucide-react";
import { Plot, Project } from "@/shared/types";

interface ProjectMapCanvasProps {
  project: Project;
  filteredPlots: Plot[];
  selectedPlot: Plot | null;
  setSelectedPlot: (plot: Plot | null) => void;
  hoveredPlot: Plot | null;
  setHoveredPlot: (plot: Plot | null) => void;
  tooltipPos: { x: number; y: number };
  setTooltipPos: (pos: { x: number; y: number }) => void;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  transformRef: React.RefObject<any>;
  handleImageLoad: () => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handlePlotHover: (plot: Plot, e: React.MouseEvent) => void;
  showLabels: boolean;
  setShowLabels: (val: boolean) => void;
  flashPlotId: string | null;
  calculatePolygonArea: (
    points: [number, number][] | undefined,
    scaleRatio: number | null | undefined
  ) => number;
}

export default function ProjectMapCanvas({
  project,
  filteredPlots,
  selectedPlot,
  setSelectedPlot,
  hoveredPlot,
  setHoveredPlot,
  tooltipPos,
  mapContainerRef,
  transformRef,
  handleImageLoad,
  handleMouseMove,
  handlePlotHover,
  showLabels,
  setShowLabels,
  flashPlotId,
  calculatePolygonArea,
}: ProjectMapCanvasProps) {
  const getCenter = (points: [number, number][] | undefined) => {
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
  };

  const getColorConfig = (
    status: string,
    isSelected: boolean,
    isHovered: boolean
  ) => {
    let fill, stroke, hoverFill;
    switch (status) {
      case "available":
        fill = "rgba(34, 197, 94, 0.35)";
        hoverFill = "rgba(34, 197, 94, 0.65)";
        stroke = "#16a34a";
        break;
      case "sold":
        fill = "rgba(239, 68, 68, 0.35)";
        hoverFill = "rgba(239, 68, 68, 0.65)";
        stroke = "#dc2626";
        break;
      case "reserved":
        fill = "rgba(234, 179, 8, 0.35)";
        hoverFill = "rgba(234, 179, 8, 0.65)";
        stroke = "#ca8a04";
        break;
      case "road":
        fill = "rgba(107, 114, 128, 0.3)";
        hoverFill = "rgba(107, 114, 128, 0.5)";
        stroke = "#4b5563";
        break;
      case "market":
        fill = "rgba(59, 130, 246, 0.35)";
        hoverFill = "rgba(59, 130, 246, 0.65)";
        stroke = "#2563eb";
        break;
      case "park":
        fill = "rgba(16, 185, 129, 0.35)";
        hoverFill = "rgba(16, 185, 129, 0.65)";
        stroke = "#059669";
        break;
      default:
        fill = "rgba(255, 255, 255, 0.2)";
        hoverFill = "rgba(255, 255, 255, 0.4)";
        stroke = "#ffffff";
    }

    if (isSelected) {
      return { fill: "rgba(15, 92, 76, 0.55)", stroke: "#0f5c4c" };
    }
    if (isHovered) {
      return { fill: hoverFill, stroke: "#ffffff" };
    }
    return { fill, stroke };
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return {
          text: "Available",
          color: "text-green-400",
          bg: "bg-green-500/20 border-green-500/30",
        };
      case "sold":
        return {
          text: "Sold",
          color: "text-red-400",
          bg: "bg-red-500/20 border-red-500/30",
        };
      case "reserved":
        return {
          text: "Reserved",
          color: "text-yellow-400",
          bg: "bg-yellow-500/20 border-yellow-500/30",
        };
      case "road":
        return {
          text: "Road",
          color: "text-gray-400",
          bg: "bg-gray-500/20 border-gray-500/30",
        };
      case "market":
        return {
          text: "Market",
          color: "text-blue-400",
          bg: "bg-blue-500/20 border-blue-500/30",
        };
      case "park":
        return {
          text: "Park",
          color: "text-emerald-400",
          bg: "bg-emerald-500/20 border-emerald-500/30",
        };
      default:
        return {
          text: status,
          color: "text-gray-400",
          bg: "bg-gray-500/20 border-gray-500/30",
        };
    }
  };

  const getDimensionOffsetPoint = (
    p1: [number, number],
    p2: [number, number],
    cx: number,
    cy: number,
    distance = 1.0
  ): [number, number] => {
    const mx = (p1[0] + p2[0]) / 2;
    const my = (p1[1] + p2[1]) / 2;
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < 0.0001) return [mx, my];

    let nx = -dy / len;
    let ny = dx / len;
    const vx = mx - cx;
    const vy = my - cy;

    if (nx * vx + ny * vy < 0) {
      nx = -nx;
      ny = -ny;
    }

    return [mx + nx * distance, my + ny * distance];
  };

  return (
    <div
      className="flex-1 relative bg-gray-200 dark:bg-gray-900 transition-colors"
      ref={mapContainerRef}
      onMouseMove={handleMouseMove}
    >
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.5}
        maxScale={8}
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2 bg-theme-card rounded-lg shadow-md p-1 border border-theme-border">
              <button
                onClick={() => zoomIn()}
                className="p-2 hover:bg-theme-bg rounded text-theme-text"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => zoomOut()}
                className="p-2 hover:bg-theme-bg rounded text-theme-text"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => resetTransform()}
                className="p-2 hover:bg-theme-bg rounded text-theme-text"
                title="Reset View"
              >
                <Maximize className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowLabels(!showLabels)}
                className="p-2 hover:bg-theme-bg rounded text-theme-text border-t border-theme-border"
                title={showLabels ? "Hide Plot Labels" : "Show Plot Labels"}
              >
                {showLabels ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
              <div className="relative inline-block h-[45vh] md:h-[80vh]">
                <img
                  src={project.image}
                  alt={project.name}
                  onLoad={handleImageLoad}
                  className="h-full w-auto block shadow-xl"
                  draggable="false"
                  style={{
                    transform: `translate(${project.bgX || 0}px, ${project.bgY || 0}px) scale(${project.bgScale || 1}) rotate(${project.bgRotate || 0}deg)`,
                    transformOrigin: "top left",
                    opacity: project.bgOpacity !== undefined ? project.bgOpacity : 1,
                    transition: "opacity 0.2s",
                  }}
                />

                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="0.3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {filteredPlots.map((plot) => {
                    const isSelected = selectedPlot?.id === plot.id;
                    const isHovered = hoveredPlot?.id === plot.id;
                    const isFlashed = flashPlotId === plot.id;

                    if (!plot.points) return null;
                    const pointsString = plot.points.map((p) => `${p[0]},${p[1]}`).join(" ");
                    const center = getCenter(plot.points);
                    const labelX = center.x + (plot.labelOffset?.x || 0);
                    const labelY = center.y + (plot.labelOffset?.y || 0);
                    const labelRot = plot.labelRotation || 0;
                    const colors = getColorConfig(plot.status, isSelected, isHovered);

                    return (
                      <g
                        key={plot.id}
                        className="pointer-events-auto cursor-pointer"
                        onClick={() => setSelectedPlot(plot)}
                        onMouseEnter={(e) => handlePlotHover(plot, e)}
                        onMouseLeave={() => setHoveredPlot(null)}
                      >
                        <polygon
                          id={`poly-${plot.id}`}
                          points={pointsString}
                          fill={colors.fill}
                          stroke={isFlashed ? "#eab308" : colors.stroke}
                          strokeWidth={
                            isFlashed
                              ? "0.6"
                              : isSelected
                                ? "0.5"
                                : isHovered
                                  ? "0.4"
                                  : "0.15"
                          }
                          filter={isHovered ? "url(#glow)" : undefined}
                          vectorEffect="non-scaling-stroke"
                          className={isFlashed ? "animate-pulse" : ""}
                          style={{
                            transition: "fill 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease",
                            transformOrigin: `${center.x}% ${center.y}%`,
                          }}
                        />

                        {(isSelected || isHovered) &&
                          project.scaleRatio &&
                          plot.points && (() => {
                            const pts = plot.points;
                            const ratio = project.scaleRatio;
                            return (
                              <g className="pointer-events-none opacity-90 animate-fadeIn">
                                {pts.map((pt, i) => {
                                  const nextPt = pts[(i + 1) % pts.length];
                                  const dx = nextPt[0] - pt[0];
                                  const dy = nextPt[1] - pt[1];
                                  const edgeLen = Math.sqrt(dx * dx + dy * dy) * ratio;
                                  const labelPos = getDimensionOffsetPoint(
                                    pt,
                                    nextPt,
                                    center.x,
                                    center.y,
                                    0.95
                                  );
                                  return (
                                    <text
                                      key={`dim-${plot.id}-${i}`}
                                      x={labelPos[0]}
                                      y={labelPos[1]}
                                      fill="#ca8a04"
                                      fontSize="0.8"
                                      fontWeight="bold"
                                      textAnchor="middle"
                                      alignmentBaseline="middle"
                                      style={{ textShadow: "0 0 2px white" }}
                                    >
                                      {Math.round(edgeLen)} ft
                                    </text>
                                  );
                                })}
                              </g>
                            );
                          })()}

                        {showLabels && plot.status !== "road" && (
                          <text
                            x={labelX}
                            y={labelY}
                            transform={`rotate(${labelRot}, ${labelX}, ${labelY})`}
                            fill="white"
                            fontSize="1.2"
                            fontWeight="bold"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            className="drop-shadow-md pointer-events-none select-none"
                            style={{
                              textShadow: "0 0 3px rgba(0,0,0,0.8)",
                              opacity: isHovered ? 1 : 0.85,
                            }}
                          >
                            {plot.number}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {hoveredPlot && !selectedPlot && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: tooltipPos.x + 16,
            top: tooltipPos.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          <div className="bg-gray-900/95 backdrop-blur-sm text-white rounded-lg px-3 py-2 shadow-xl border border-white/10 whitespace-nowrap">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm">
                {["road", "market", "park"].includes(hoveredPlot.status)
                  ? hoveredPlot.number || hoveredPlot.status.toUpperCase()
                  : `Plot ${hoveredPlot.number || "—"}`}
              </span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded border capitalize font-medium ${getStatusLabel(hoveredPlot.status).bg} ${getStatusLabel(hoveredPlot.status).color}`}
              >
                {getStatusLabel(hoveredPlot.status).text}
              </span>
            </div>
            {(hoveredPlot.size || project.scaleRatio || hoveredPlot.price) && (
              <div className="text-xs text-gray-300 mt-1 flex items-center space-x-3">
                <span>
                  {hoveredPlot.size
                    ? hoveredPlot.size
                    : calculatePolygonArea(hoveredPlot.points, project.scaleRatio)}{" "}
                  Sq.Ft
                </span>
                {(hoveredPlot.price || (hoveredPlot.rate && project.scaleRatio)) && (
                  <span>
                    ₹
                    {hoveredPlot.price
                      ? hoveredPlot.price
                      : (
                          calculatePolygonArea(hoveredPlot.points, project.scaleRatio) *
                          parseFloat(hoveredPlot.rate)
                        ).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            )}
            <div className="text-[10px] text-gray-400 mt-1">Click for details</div>
          </div>
        </div>
      )}
    </div>
  );
}
