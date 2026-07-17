import { X, Trash2, Copy, Scissors, Grid } from "lucide-react";
import { Project, Plot, EditingPlot } from "@/shared/types";

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
  setSubdivisionForm: React.Dispatch<React.SetStateAction<{
    mode: string;
    count: number;
    targetSize: number;
    direction: string;
    method: string;
  }>>;
  executeSubdivision: () => void;
  plotForm: {
    number: string;
    size: string;
    rate: string;
    price: string;
    status: string;
    labelRotation: number;
  };
  setPlotForm: React.Dispatch<React.SetStateAction<{
    number: string;
    size: string;
    rate: string;
    price: string;
    status: string;
    labelRotation: number;
  }>>;
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

export default function AdminMapSidebar({
  editingPlot,
  setEditingPlot,
  subdivisionActive,
  setSubdivisionActive,
  subdivisionForm,
  setSubdivisionForm,
  executeSubdivision,
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
}: AdminMapSidebarProps) {
  const calculatePrice = (size: string, rate: string, currentPrice: string) => {
    const s = parseFloat(size);
    const r = parseFloat(rate);
    if (!isNaN(s) && !isNaN(r)) return (s * r).toLocaleString("en-IN");
    return currentPrice;
  };

  return (
    <div className="w-full md:w-96 h-1/2 md:h-full bg-white dark:bg-gray-850 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 shadow-xl overflow-y-auto flex flex-col p-6 z-10 flex-shrink-0 transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold dark:text-white">
          {subdivisionActive
            ? "Subdivide Area"
            : editingPlot.isNew
              ? "New Area Details"
              : "Edit Area"}
        </h2>
        <button
          type="button"
          onClick={() => setEditingPlot(null)}
          className="text-gray-500 hover:text-gray-750 dark:text-gray-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {subdivisionActive ? (
        <div className="space-y-4 flex-1 flex flex-col justify-between mt-2">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Subdivide By
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() =>
                    setSubdivisionForm({
                      ...subdivisionForm,
                      mode: "count",
                    })
                  }
                  className={`flex-1 px-3 py-1.5 text-xs font-semibold border border-gray-300 dark:border-gray-700 rounded-l-md transition-colors ${
                    subdivisionForm.mode === "count"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
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
                  className={`flex-1 px-3 py-1.5 text-xs font-semibold border-t border-b border-r border-gray-300 dark:border-gray-700 rounded-r-md transition-colors ${
                    subdivisionForm.mode === "size"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white dark:bg-gray-900 text-gray-750 dark:text-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Target Sq Ft
                </button>
              </div>
            </div>

            {subdivisionForm.mode === "count" ? (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Number of Divisions
                </label>
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
                  className="mt-1 block w-full rounded-md border-gray-350 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs p-2 border"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Target Size (Sq Ft)
                </label>
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
                  className="mt-1 block w-full rounded-md border-gray-350 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs p-2 border"
                />
                {!project.scaleRatio && (
                  <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold block mt-1">
                    ⚠️ Calibrate scale ruler in settings first.
                  </span>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Split Method
              </label>
              <select
                value={subdivisionForm.method}
                onChange={(e) =>
                  setSubdivisionForm({
                    ...subdivisionForm,
                    method: e.target.value,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-350 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs p-2 border"
              >
                <option value="area">Equal Area (Proportional Slicing)</option>
                <option value="spacing">Equal Spacing (Bounding box intervals)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Cut Direction
              </label>
              <select
                value={subdivisionForm.direction}
                onChange={(e) =>
                  setSubdivisionForm({
                    ...subdivisionForm,
                    direction: e.target.value,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-350 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs p-2 border"
              >
                <option value="vertical">Vertical Slices (Left-to-Right)</option>
                <option value="horizontal">Horizontal Slices (Top-to-Bottom)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t dark:border-gray-700 mt-6 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSubdivisionActive(false)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={executeSubdivision}
              className="bg-indigo-650 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-xs font-semibold shadow-sm"
            >
              Apply Subdivide
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSavePlot} className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-305">
                Name / Number
              </label>
              <input
                required={!["road", "park"].includes(plotForm.status)}
                type="text"
                value={plotForm.number}
                onChange={(e) => setPlotForm({ ...plotForm, number: e.target.value })}
                placeholder="e.g. Plot 41 or Main Road"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-305">
                    Size
                  </label>
                  {project.scaleRatio && (
                    <button
                      type="button"
                      onClick={handleAutoCalculateSize}
                      className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold"
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
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-305">
                  Rate (₹)
                </label>
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
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-305">
                  Price (₹)
                </label>
                <input
                  type="text"
                  value={plotForm.price}
                  onChange={(e) => setPlotForm({ ...plotForm, price: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-305">
                Area Type / Status
              </label>
              <select
                value={plotForm.status}
                onChange={(e) => setPlotForm({ ...plotForm, status: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-305">
                  Label Rotation (degrees)
                </label>
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
                  className="w-full mt-1 accent-indigo-650"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>-180°</span>
                  <span>{plotForm.labelRotation || 0}°</span>
                  <span>180°</span>
                </div>
              </div>
            )}

            {/* Manual Vertex Coordinates Inspector */}
            {!editingPlot.isNew && (
              <div className="space-y-1.5 pt-2 border-t dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-305">
                  Vertices Coordinates (X%, Y%)
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-900/50">
                  {editingPlot.points.map((pt: any, idx: number) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs py-0.5">
                      <span className="font-semibold text-gray-400 w-8">Pt {idx + 1}:</span>
                      <div className="flex items-center border rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 h-6">
                        <span className="text-[10px] text-gray-400 mr-1">X</span>
                        <input
                          type="number"
                          step="0.1"
                          value={pt[0]}
                          onChange={(e) =>
                            handleVertexManualEdit(idx, 0, parseFloat(e.target.value))
                          }
                          className="w-12 dark:bg-gray-800 dark:text-white outline-none text-center"
                        />
                      </div>
                      <div className="flex items-center border rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 h-6">
                        <span className="text-[10px] text-gray-400 mr-1">Y</span>
                        <input
                          type="number"
                          step="0.1"
                          value={pt[1]}
                          onChange={(e) =>
                            handleVertexManualEdit(idx, 1, parseFloat(e.target.value))
                          }
                          className="w-12 dark:bg-gray-800 dark:text-white outline-none text-center"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleVertexManualDelete(idx)}
                        disabled={editingPlot.points.length <= 3}
                        className="text-red-500 hover:text-red-600 disabled:opacity-30 ml-auto"
                        title="Delete vertex"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700 flex-wrap gap-2 mt-4">
            {!editingPlot.isNew ? (
              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={handleDeletePlot}
                  className="text-red-600 hover:text-red-600 flex items-center"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </button>
                <button
                  type="button"
                  onClick={handleEditShapeClick}
                  className="text-yellow-600 hover:text-yellow-700 flex items-center"
                >
                  Edit Shape
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicatePlot(editingPlot)}
                  className="text-indigo-650 hover:text-indigo-700 flex items-center"
                  title="Clone this plot"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubdivisionActive(true);
                  }}
                  className="text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center"
                  title="Subdivide this plot"
                >
                  <Scissors className="w-3.5 h-3.5 mr-1" /> Subdivide
                </button>
                {editingPlot.points.length === 4 && (
                  <button
                    type="button"
                    onClick={() => orthogonalizePlot(editingPlot.id)}
                    className="text-emerald-600 hover:text-emerald-700 flex items-center"
                    title="Snap vertices to horizontal/vertical align"
                  >
                    <Grid className="w-3.5 h-3.5 mr-1" /> Align
                  </button>
                )}
              </div>
            ) : (
              <div />
            )}
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-medium shadow-sm ml-auto"
            >
              Save Area
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
