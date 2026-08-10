import { X, Trash2, Copy, Scissors, Grid } from "lucide-react";
import { Project, Plot, EditingPlot } from "@/shared/types";
import Drawer from "@/shared/components/ui/Drawer";
import Button from "@/shared/components/ui/Button";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import {
  areaSqFt,
  edgeLengthsFt,
  facingHint,
  perimeterFt,
} from "@/features/plots/utils/adminMapMetrics";
import { isSoftLockedStatus } from "@/features/plots/utils/adminMapEditorPrecision";

interface AdminMapSidebarProps {
  editingPlot: EditingPlot;
  setEditingPlot: (val: EditingPlot | null) => void;
  subdivisionActive: boolean;
  setSubdivisionActive: (val: boolean) => void;
  subdivisionForm: {
    mode: string;
    count: number;
    targetSize: number;
    direction: string;
    method: string;
  };
  setSubdivisionForm: React.Dispatch<
    React.SetStateAction<{
      mode: string;
      count: number;
      targetSize: number;
      direction: string;
      method: string;
    }>
  >;
  executeSubdivision: () => void;
  frontageForm?: { edgeIndex: number; depthFt: number };
  setFrontageForm?: React.Dispatch<
    React.SetStateAction<{ edgeIndex: number; depthFt: number }>
  >;
  executeFrontageSplit?: () => void;
  plotForm: {
    number: string;
    size: string;
    rate: string;
    price: string;
    status: string;
    labelRotation: number;
  };
  setPlotForm: React.Dispatch<
    React.SetStateAction<{
      number: string;
      size: string;
      rate: string;
      price: string;
      status: string;
      labelRotation: number;
    }>
  >;
  handleSavePlot: (e: React.FormEvent) => void;
  handleDeletePlot: () => void;
  handleEditShapeClick: () => void;
  handleDuplicatePlot: (plot: Plot) => void;
  orthogonalizePlot: (plotId: string) => void;
  project: Project;
  handleAutoCalculateSize: () => void;
  handleVertexManualEdit: (idx: number, coordIdx: number, val: number) => void;
  handleVertexManualDelete: (idx: number) => void;
}

const fieldClass =
  "mt-1 block w-full rounded-theme border border-theme-border bg-theme-card text-theme-text shadow-sm " +
  "focus:border-theme-accent focus:ring-2 focus:ring-theme-ring text-xs sm:text-sm p-2.5 min-h-11";

const labelClass = "block text-sm font-medium text-theme-text";
const labelCapsClass =
  "block text-xs font-semibold text-theme-muted uppercase tracking-wider";

export default function AdminMapSidebar(props: AdminMapSidebarProps) {
  const {
    editingPlot,
    setEditingPlot,
    subdivisionActive,
    setSubdivisionActive,
  } = props;

  const isMdUp = useMediaQuery("(min-width: 768px)");

  const title = subdivisionActive
    ? "Subdivide Area"
    : editingPlot.isNew
      ? "New Area Details"
      : "Edit Area";

  const body = (
    <AdminMapSidebarBody {...props} showInlineHeader={isMdUp} />
  );

  if (!isMdUp) {
    return (
      <Drawer
        isOpen={!!editingPlot}
        onClose={() => {
          setSubdivisionActive(false);
          setEditingPlot(null);
        }}
        title={title}
        position="bottom"
        size="lg"
      >
        {body}
      </Drawer>
    );
  }

  return (
    <aside
      className="hidden md:flex w-96 h-full bg-theme-card border-l border-theme-border shadow-xl overflow-y-auto flex-col p-6 z-10 flex-shrink-0 transition-all duration-300"
      aria-label="Area edit panel"
    >
      {body}
    </aside>
  );
}

function AdminMapSidebarBody({
  editingPlot,
  setEditingPlot,
  subdivisionActive,
  setSubdivisionActive,
  subdivisionForm,
  setSubdivisionForm,
  executeSubdivision,
  frontageForm,
  setFrontageForm,
  executeFrontageSplit,
  plotForm,
  setPlotForm,
  handleSavePlot,
  handleDeletePlot,
  handleEditShapeClick,
  handleDuplicatePlot,
  orthogonalizePlot,
  project,
  handleAutoCalculateSize,
  handleVertexManualEdit,
  handleVertexManualDelete,
  showInlineHeader,
}: AdminMapSidebarProps & { showInlineHeader: boolean }) {
  const calculatePrice = (size: string, rate: string, currentPrice: string) => {
    const s = parseFloat(size);
    const r = parseFloat(rate);
    if (!isNaN(s) && !isNaN(r)) return (s * r).toLocaleString("en-IN");
    return currentPrice;
  };

  const scale = project.scaleRatio || 0;
  const liveArea =
    scale > 0 && editingPlot.points?.length >= 3
      ? Math.round(areaSqFt(editingPlot.points, scale))
      : null;
  const livePerimeter =
    scale > 0 && editingPlot.points?.length >= 2
      ? Math.round(perimeterFt(editingPlot.points, scale))
      : null;
  const edgeLens =
    scale > 0 && editingPlot.points?.length >= 2
      ? edgeLengthsFt(editingPlot.points, scale)
      : [];
  const frontageLen =
    edgeLens.length > 0 ? Math.round(Math.max(...edgeLens)) : null;
  const facing = editingPlot.points?.length >= 2 ? facingHint(editingPlot.points) : "";
  const softLocked = isSoftLockedStatus(plotForm.status || editingPlot.status);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {showInlineHeader && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-theme-text">
            {subdivisionActive
              ? "Subdivide Area"
              : editingPlot.isNew
                ? "New Area Details"
                : "Edit Area"}
          </h2>
          <button
            type="button"
            onClick={() => setEditingPlot(null)}
            aria-label="Close edit panel"
            className={
              "min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme text-theme-muted " +
              "hover:text-theme-text hover:bg-theme-surface transition-colors " +
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
            }
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      )}

      {subdivisionActive ? (
        <div className="space-y-4 flex-1 flex flex-col justify-between mt-2">
          <div className="space-y-4">
            <div>
              <label className={labelCapsClass}>Subdivide By</label>
              <div className="mt-1 flex rounded-theme shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setSubdivisionForm({
                      ...subdivisionForm,
                      mode: "count",
                    })
                  }
                  className={`flex-1 min-h-11 px-3 py-2 text-xs font-semibold border border-theme-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                    subdivisionForm.mode === "count"
                      ? "bg-theme-accent text-theme-accent-fg border-theme-accent"
                      : "bg-theme-card text-theme-text hover:bg-theme-surface"
                  }`}
                >
                  Equal Parts
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSubdivisionForm({
                      ...subdivisionForm,
                      mode: "size",
                    })
                  }
                  className={`flex-1 min-h-11 px-3 py-2 text-xs font-semibold border-t border-b border-r border-theme-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                    subdivisionForm.mode === "size"
                      ? "bg-theme-accent text-theme-accent-fg border-theme-accent"
                      : "bg-theme-card text-theme-text hover:bg-theme-surface"
                  }`}
                >
                  Target Sq Ft
                </button>
              </div>
            </div>

            {subdivisionForm.mode === "count" ? (
              <div>
                <label className={labelCapsClass}>Number of Divisions</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={subdivisionForm.count}
                  onChange={(e) =>
                    setSubdivisionForm({
                      ...subdivisionForm,
                      count: Math.max(2, parseInt(e.target.value) || 2),
                    })
                  }
                  className={fieldClass}
                />
              </div>
            ) : (
              <div>
                <label className={labelCapsClass}>Target Size (Sq Ft)</label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={subdivisionForm.targetSize}
                  onChange={(e) =>
                    setSubdivisionForm({
                      ...subdivisionForm,
                      targetSize: Math.max(50, parseFloat(e.target.value) || 1000),
                    })
                  }
                  className={fieldClass}
                />
                {!project.scaleRatio && (
                  <span className="text-[10px] text-theme-warning font-semibold block mt-1">
                    Calibrate scale ruler in settings first.
                  </span>
                )}
              </div>
            )}

            <div>
              <label className={labelCapsClass}>Split Method</label>
              <select
                value={subdivisionForm.method}
                onChange={(e) =>
                  setSubdivisionForm({
                    ...subdivisionForm,
                    method: e.target.value,
                  })
                }
                className={fieldClass}
              >
                <option value="area">Equal Area (Proportional Slicing)</option>
                <option value="spacing">Equal Spacing (Bounding box intervals)</option>
              </select>
            </div>

            <div>
              <label className={labelCapsClass}>Cut Direction</label>
              <select
                value={subdivisionForm.direction}
                onChange={(e) =>
                  setSubdivisionForm({
                    ...subdivisionForm,
                    direction: e.target.value,
                  })
                }
                className={fieldClass}
              >
                <option value="vertical">Vertical Slices (Left-to-Right)</option>
                <option value="horizontal">Horizontal Slices (Top-to-Bottom)</option>
              </select>
            </div>

            {frontageForm && setFrontageForm && executeFrontageSplit && (
              <div className="pt-3 border-t border-theme-border space-y-3">
                <label className={labelCapsClass}>Frontage Split</label>
                <div>
                  <label className={labelClass}>Frontage edge</label>
                  <select
                    value={frontageForm.edgeIndex}
                    onChange={(e) =>
                      setFrontageForm({
                        ...frontageForm,
                        edgeIndex: parseInt(e.target.value) || 0,
                      })
                    }
                    className={fieldClass}
                  >
                    {editingPlot.points.map((_, i) => {
                      const len =
                        edgeLens[i] != null ? ` (${Math.round(edgeLens[i])} ft)` : "";
                      return (
                        <option key={i} value={i}>
                          Edge {i + 1}
                          {len}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Depth (ft)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={frontageForm.depthFt}
                    onChange={(e) =>
                      setFrontageForm({
                        ...frontageForm,
                        depthFt: Math.max(1, parseFloat(e.target.value) || 1),
                      })
                    }
                    className={fieldClass}
                  />
                  {!project.scaleRatio && (
                    <span className="text-[10px] text-theme-warning font-semibold block mt-1">
                      Calibrate scale ruler in settings first.
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={executeFrontageSplit}
                >
                  Preview Frontage Split
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-theme-border mt-6 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSubdivisionActive(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={executeSubdivision}>
              Apply Subdivide
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSavePlot} className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            {softLocked && (
              <p className="text-xs text-theme-warning font-semibold">
                Soft-locked ({plotForm.status}) — geometry edits require confirmation.
              </p>
            )}
            {(liveArea != null || livePerimeter != null) && (
              <div className="text-xs text-theme-muted space-y-0.5">
                {liveArea != null && (
                  <p>
                    Live area:{" "}
                    <span className="text-theme-text font-semibold">{liveArea} sq ft</span>
                  </p>
                )}
                {livePerimeter != null && (
                  <p>
                    Perimeter:{" "}
                    <span className="text-theme-text font-semibold">
                      {livePerimeter} ft
                    </span>
                  </p>
                )}
                {frontageLen != null && (
                  <p>
                    Frontage (longest):{" "}
                    <span className="text-theme-text font-semibold">
                      {frontageLen} ft
                      {facing ? ` · ${facing}` : ""}
                    </span>
                  </p>
                )}
              </div>
            )}
            <div>
              <label className={labelClass}>Name / Number</label>
              <input
                required={!["road", "park"].includes(plotForm.status)}
                type="text"
                value={plotForm.number}
                onChange={(e) => setPlotForm({ ...plotForm, number: e.target.value })}
                placeholder="e.g. Plot 41 or Main Road"
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Size</label>
                  {project.scaleRatio && (
                    <button
                      type="button"
                      onClick={handleAutoCalculateSize}
                      className="text-[10px] text-theme-accent hover:opacity-80 font-semibold min-h-11 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
                      title="Auto-calculate size based on polygon area"
                    >
                      Auto
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={plotForm.size}
                  onChange={(e) => {
                    const size = e.target.value;
                    setPlotForm({
                      ...plotForm,
                      size,
                      price: calculatePrice(size, plotForm.rate, plotForm.price),
                    });
                  }}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Rate (₹)</label>
                <input
                  type="number"
                  value={plotForm.rate}
                  onChange={(e) => {
                    const rate = e.target.value;
                    setPlotForm({
                      ...plotForm,
                      rate,
                      price: calculatePrice(plotForm.size, rate, plotForm.price),
                    });
                  }}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Price (₹)</label>
                <input
                  type="text"
                  value={plotForm.price}
                  onChange={(e) => setPlotForm({ ...plotForm, price: e.target.value })}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Area Type / Status</label>
              <select
                value={plotForm.status}
                onChange={(e) => setPlotForm({ ...plotForm, status: e.target.value })}
                className={fieldClass}
              >
                <optgroup label="Plots">
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="sold">Sold</option>
                </optgroup>
                <optgroup label="Infrastructure">
                  <option value="road">Road</option>
                  <option value="market">Market / Commercial</option>
                  <option value="park">Park / Amenity</option>
                </optgroup>
              </select>
            </div>

            {!editingPlot.isNew && plotForm.status !== "road" && (
              <div>
                <label className={labelClass}>Label Rotation (degrees)</label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={plotForm.labelRotation || 0}
                  onChange={(e) =>
                    setPlotForm({
                      ...plotForm,
                      labelRotation: parseInt(e.target.value),
                    })
                  }
                  className="w-full mt-1 accent-[var(--theme-accent)] min-h-11"
                />
                <div className="flex justify-between text-xs text-theme-muted">
                  <span>-180°</span>
                  <span>{plotForm.labelRotation || 0}°</span>
                  <span>180°</span>
                </div>
              </div>
            )}

            {!editingPlot.isNew && (
              <div className="space-y-1.5 pt-2 border-t border-theme-border">
                <label className={labelClass}>Vertices Coordinates (X%, Y%)</label>
                <div className="max-h-36 overflow-y-auto space-y-1 border border-theme-border rounded-theme p-2 bg-theme-surface/50">
                  {editingPlot.points.map((pt: [number, number], idx: number) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs py-0.5">
                      <span className="font-semibold text-theme-muted w-8">Pt {idx + 1}:</span>
                      <div className="flex items-center border rounded-theme border-theme-border bg-theme-card px-1.5 min-h-11">
                        <span className="text-[10px] text-theme-muted mr-1">X</span>
                        <input
                          type="number"
                          step="0.1"
                          value={pt[0]}
                          onChange={(e) =>
                            handleVertexManualEdit(idx, 0, parseFloat(e.target.value))
                          }
                          aria-label={`Vertex ${idx + 1} X`}
                          className="w-12 bg-transparent text-theme-text outline-none text-center focus-visible:ring-2 focus-visible:ring-theme-ring rounded"
                        />
                      </div>
                      <div className="flex items-center border rounded-theme border-theme-border bg-theme-card px-1.5 min-h-11">
                        <span className="text-[10px] text-theme-muted mr-1">Y</span>
                        <input
                          type="number"
                          step="0.1"
                          value={pt[1]}
                          onChange={(e) =>
                            handleVertexManualEdit(idx, 1, parseFloat(e.target.value))
                          }
                          aria-label={`Vertex ${idx + 1} Y`}
                          className="w-12 bg-transparent text-theme-text outline-none text-center focus-visible:ring-2 focus-visible:ring-theme-ring rounded"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleVertexManualDelete(idx)}
                        disabled={editingPlot.points.length <= 3}
                        className={
                          "text-theme-danger hover:opacity-80 disabled:opacity-30 ml-auto min-h-11 min-w-11 inline-flex items-center justify-center " +
                          "rounded-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                        }
                        aria-label={`Delete vertex ${idx + 1}`}
                        title="Delete vertex"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-theme-border flex-wrap gap-2 mt-4">
            {!editingPlot.isNew ? (
              <div className="flex items-center flex-wrap gap-1 text-xs">
                <button
                  type="button"
                  onClick={handleDeletePlot}
                  className="text-theme-danger hover:opacity-80 flex items-center min-h-11 px-2 rounded-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Delete
                </button>
                <button
                  type="button"
                  onClick={handleEditShapeClick}
                  className="text-theme-warning hover:opacity-80 flex items-center min-h-11 px-2 rounded-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                >
                  Edit Shape
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicatePlot(editingPlot)}
                  className="text-theme-accent hover:opacity-80 flex items-center min-h-11 px-2 rounded-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                  title="Clone this plot"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => setSubdivisionActive(true)}
                  className="text-theme-accent hover:opacity-80 flex items-center min-h-11 px-2 rounded-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                  title="Subdivide this plot"
                >
                  <Scissors className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Subdivide
                </button>
                {editingPlot.points.length === 4 && (
                  <button
                    type="button"
                    onClick={() => orthogonalizePlot(editingPlot.id)}
                    className="text-theme-success hover:opacity-80 flex items-center min-h-11 px-2 rounded-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                    title="Align vertices to horizontal/vertical"
                  >
                    <Grid className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Align
                  </button>
                )}
              </div>
            ) : (
              <div />
            )}
            <Button type="submit" variant="primary" size="sm" className="ml-auto">
              Save Area
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
