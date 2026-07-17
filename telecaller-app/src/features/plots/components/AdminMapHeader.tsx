import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Undo2,
  Redo2,
  Plus,
  Scissors,
  CheckSquare,
  Move,
  Settings,
  X,
  Trash2,
} from "lucide-react";
import { Project } from "@/shared/types";

interface AdminMapHeaderProps {
  project: Project;
  projectId: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearchFocus: (number: string) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  pastHistoryLength: number;
  futureHistoryLength: number;
  mode: string;
  setMode: (mode: string) => void;
  setActivePlotId: (id: string | null) => void;
  setSelectedPlotIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setSlicePoints: (pts: any[]) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  selectedPlotIds: string[];
  freeSelectActive: boolean;
  setFreeSelectActive: (active: boolean) => void;
  bulkStatus: string;
  setBulkStatus: (status: string) => void;
  bulkRate: string;
  setBulkRate: (rate: string) => void;
  handleMergePlots: () => void;
  handleBulkDelete: () => void;
  handleSelectAll: () => void;
  editSubMode: string;
  setEditSubMode: (mode: string) => void;
  setDrawingPoints: (pts: [number, number][]) => void;
  handleFinishDrawing: () => void;
  setCalibrationPoints: (pts: any[]) => void;
  pushToHistory: () => void;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
}

export default function AdminMapHeader({
  project,
  projectId,
  searchQuery,
  setSearchQuery,
  handleSearchFocus,
  handleUndo,
  handleRedo,
  pastHistoryLength,
  futureHistoryLength,
  mode,
  setMode,
  setActivePlotId,
  setSelectedPlotIds,
  setSlicePoints,
  showSettings,
  setShowSettings,
  selectedPlotIds,
  freeSelectActive,
  setFreeSelectActive,
  bulkStatus,
  setBulkStatus,
  bulkRate,
  setBulkRate,
  handleMergePlots,
  handleBulkDelete,
  handleSelectAll,
  editSubMode,
  setEditSubMode,
  setDrawingPoints,
  handleFinishDrawing,
  setCalibrationPoints,
  pushToHistory,
  updateProject,
}: AdminMapHeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 z-10 transition-colors">
      <div className="px-2 md:px-4 py-2 md:py-3 flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
        <div className="flex items-center w-full md:w-auto justify-between md:justify-start space-x-2 md:space-x-4">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Link
              to="/admin"
              className="p-1 md:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate max-w-[150px] md:max-w-none">
              Edit Map: {project.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-hide">
          <div className="relative flex items-center bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 h-8 mr-2 flex-shrink-0 border border-slate-200 dark:border-slate-800">
            <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-305 mr-1.5" />
            <input
              type="text"
              placeholder="Search plot..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearchFocus(e.target.value);
              }}
              className="bg-transparent border-none outline-none text-xs dark:text-white w-20 md:w-28"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-gray-400 dark:text-gray-300 hover:text-gray-605"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex space-x-1 border-r border-gray-250 dark:border-gray-700 pr-2 mr-2">
            <button
              onClick={handleUndo}
              disabled={pastHistoryLength === 0}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={futureHistoryLength === 0}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-30"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {mode === "view" && (
            <>
              <button
                onClick={() => {
                  setMode("draw");
                  setActivePlotId(null);
                }}
                className="flex-shrink-0 flex items-center px-3 py-1.5 bg-indigo-600 text-white text-xs md:text-sm rounded hover:bg-indigo-750 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Draw Area
              </button>
              <button
                onClick={() => {
                  setMode("slice");
                  setActivePlotId(null);
                  setSlicePoints([]);
                }}
                className="flex-shrink-0 flex items-center px-3 py-1.5 bg-purple-600 text-white text-xs md:text-sm rounded hover:bg-purple-700 transition cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 mr-1" /> Slice
              </button>
              <button
                onClick={() => {
                  setMode("bulk");
                  setActivePlotId(null);
                  setSelectedPlotIds([]);
                }}
                className="flex-shrink-0 flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs md:text-sm rounded hover:bg-blue-700 transition cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5 mr-1" /> Bulk Action
              </button>
              <button
                onClick={() => {
                  setMode("editLabels");
                  setActivePlotId(null);
                }}
                className="flex-shrink-0 flex items-center px-3 py-1.5 bg-emerald-600 text-white text-xs md:text-sm rounded hover:bg-emerald-700 transition cursor-pointer"
                title="Drag to adjust plot label offset"
              >
                <Move className="w-3.5 h-3.5 mr-1" /> Move Labels
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex-shrink-0 p-1.5 rounded border transition cursor-pointer ${
                  showSettings
                    ? "bg-gray-200 dark:bg-gray-700 border-indigo-500"
                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                } text-gray-700 dark:text-gray-300`}
              >
                <Settings className="w-4 h-4" />
              </button>
            </>
          )}

          {mode === "draw" && (
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setDrawingPoints([]);
                  setMode("view");
                }}
                className="flex-shrink-0 px-3 py-1.5 bg-gray-200 text-gray-800 text-xs md:text-sm rounded hover:bg-gray-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFinishDrawing}
                className="flex-shrink-0 flex items-center px-3 py-1.5 bg-green-600 text-white text-xs md:text-sm rounded hover:bg-green-750 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Finish Shape
              </button>
            </div>
          )}

          {mode === "slice" && (
            <button
              onClick={() => {
                setMode("view");
                setActivePlotId(null);
                setSlicePoints([]);
              }}
              className="flex-shrink-0 px-3 py-1.5 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white text-xs md:text-sm rounded hover:bg-gray-300 cursor-pointer"
            >
              Cancel Slice
            </button>
          )}

          {mode === "calibrate" && (
            <button
              onClick={() => {
                setMode("view");
                setCalibrationPoints([]);
              }}
              className="flex-shrink-0 px-3 py-1.5 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white text-xs md:text-sm rounded hover:bg-gray-300 cursor-pointer"
            >
              Cancel Calibration
            </button>
          )}

          {mode === "editLabels" && (
            <button
              onClick={() => {
                setMode("view");
              }}
              className="flex-shrink-0 px-3 py-1.5 bg-emerald-600 text-white text-xs md:text-sm rounded hover:bg-emerald-700 cursor-pointer"
            >
              Done Moving Labels
            </button>
          )}

          {mode === "editShape" && (
            <div className="flex items-center space-x-2">
              <div className="flex border rounded overflow-hidden bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 h-8 text-xs">
                <button
                  onClick={() => setEditSubMode("vertices")}
                  className={`px-2 py-1 cursor-pointer ${
                    editSubMode === "vertices"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                  }`}
                >
                  Edit Corners
                </button>
                <button
                  onClick={() => setEditSubMode("transform")}
                  className={`px-2 py-1 cursor-pointer ${
                    editSubMode === "transform"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                  }`}
                >
                  Scale/Rotate
                </button>
              </div>
              <button
                onClick={() => {
                  setMode("view");
                  setActivePlotId(null);
                }}
                className="flex-shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-xs md:text-sm rounded hover:bg-indigo-700 cursor-pointer"
              >
                Done Shape
              </button>
            </div>
          )}

          {mode === "bulk" && (
            <div className="flex items-center space-x-1.5 bg-blue-50 dark:bg-blue-955/40 p-1 rounded-lg border border-blue-200 dark:border-blue-900/60 flex-shrink-0 text-xs">
              <span className="font-medium text-blue-700 dark:text-blue-300 px-1">
                {selectedPlotIds.length} Selected
              </span>

              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium h-7 flex items-center shadow-sm cursor-pointer border-0"
              >
                {project.plots.every((p) => selectedPlotIds.includes(p.id)) && selectedPlotIds.length > 0
                  ? "Deselect All"
                  : "Select All"}
              </button>

              <button
                type="button"
                onClick={() => setFreeSelectActive(!freeSelectActive)}
                className={`px-2 py-1 rounded font-medium h-7 flex items-center shadow-sm cursor-pointer transition border border-solid ${
                  freeSelectActive
                    ? "bg-emerald-650 text-white border-emerald-600"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-305 border-gray-300 dark:border-gray-700 hover:bg-gray-50"
                }`}
              >
                {freeSelectActive ? "Drag Selecting" : "Free Select"}
              </button>

              <select
                value={bulkStatus}
                onChange={(e) => {
                  setBulkStatus(e.target.value);
                  if (e.target.value) {
                    pushToHistory();
                    const updated = project.plots.map((p) =>
                      selectedPlotIds.includes(p.id) ? { ...p, status: e.target.value } : p
                    );
                    updateProject(projectId, { ...project, plots: updated });
                    setSelectedPlotIds([]);
                    setMode("view");
                  }
                }}
                className="p-1 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white h-7 cursor-pointer text-xs"
              >
                <option value="">Status...</option>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
                <option value="road">Road</option>
                <option value="market">Market</option>
                <option value="park">Park</option>
              </select>

              <div className="flex items-center border rounded overflow-hidden bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 h-7 text-xs">
                <input
                  type="number"
                  placeholder="Rate"
                  value={bulkRate}
                  onChange={(e) => setBulkRate(e.target.value)}
                  className="w-12 p-1 dark:bg-gray-800 dark:text-white outline-none"
                />
                <button
                  onClick={() => {
                    const numericRate = parseFloat(bulkRate);
                    if (isNaN(numericRate)) return alert("Please enter a valid rate");
                    pushToHistory();
                    const updated = project.plots.map((p) => {
                      if (selectedPlotIds.includes(p.id)) {
                        const sizeVal = parseFloat(p.size);
                        const priceVal = isNaN(sizeVal)
                          ? p.price
                          : (sizeVal * numericRate).toLocaleString("en-IN");
                        return { ...p, rate: bulkRate, price: priceVal };
                      }
                      return p;
                      
                    });
                    updateProject(projectId, { ...project, plots: updated });
                    setSelectedPlotIds([]);
                    setMode("view");
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 font-bold border-l border-gray-300 dark:border-gray-700 cursor-pointer bg-transparent border-0"
                >
                  Apply
                </button>
              </div>

              <button
                onClick={handleMergePlots}
                disabled={selectedPlotIds.length < 2}
                className="px-2 py-1 bg-purple-600 text-white disabled:opacity-40 rounded font-medium h-7 flex items-center cursor-pointer border-0"
              >
                Merge
              </button>

              <button
                onClick={handleBulkDelete}
                className="p-1 bg-red-600 text-white rounded h-7 cursor-pointer border-0 flex items-center justify-center w-7"
                disabled={selectedPlotIds.length === 0}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
