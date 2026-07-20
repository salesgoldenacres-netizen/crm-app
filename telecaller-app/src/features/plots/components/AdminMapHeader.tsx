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
  Monitor,
} from "lucide-react";
import { Project } from "@/shared/types";
import { useToast } from "@/shared/components/Toast";

const iconBtn =
  "min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme " +
  "text-theme-muted hover:text-theme-text hover:bg-theme-surface transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring " +
  "disabled:opacity-30 disabled:pointer-events-none";

const toolBtn =
  "flex-shrink-0 inline-flex items-center justify-center gap-1 min-h-11 px-3 py-2 " +
  "text-xs md:text-sm rounded-theme font-semibold transition-colors cursor-pointer " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

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
  /** Wave 10: when false, hide edit tools and show touch gate banner. */
  canEditMaps?: boolean;
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
  canEditMaps = true,
}: AdminMapHeaderProps) {
  const { toast } = useToast();
  return (
    <header className="bg-theme-card shadow-sm border-b border-theme-border z-10 transition-colors">
      {!canEditMaps && (
        <div
          role="status"
          className="px-3 py-2 bg-theme-accent-muted border-b border-theme-border flex items-center gap-2 text-xs sm:text-sm text-theme-text"
        >
          <Monitor className="w-4 h-4 text-theme-accent flex-shrink-0" aria-hidden="true" />
          <span>
            Use a larger screen to edit maps. You can still view, pan, and zoom on this
            device.
          </span>
        </div>
      )}

      <div className="px-2 md:px-4 py-2 md:py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2 min-w-0">
        <div className="flex items-center w-full lg:w-auto justify-between lg:justify-start gap-2 md:gap-4 min-w-0">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <Link
              to="/admin"
              aria-label="Back to Admin"
              className={iconBtn}
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </Link>
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-theme-text truncate min-w-0 max-w-[min(100%,12rem)] sm:max-w-[16rem] lg:max-w-none">
              Edit Map: {project.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto overscroll-x-contain w-full lg:w-auto min-w-0 pb-1 lg:pb-0 scrollbar-hide">
          <div className="relative flex items-center bg-theme-surface rounded-theme px-2 min-h-11 mr-2 flex-shrink-0 border border-theme-border">
            <Search className="w-3.5 h-3.5 text-theme-muted mr-1.5" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search plot..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearchFocus(e.target.value);
              }}
              aria-label="Search plot"
              className="bg-transparent border-none outline-none text-xs text-theme-text w-20 md:w-28 focus-visible:ring-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className={iconBtn + " !min-h-8 !min-w-8"}
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>

          {canEditMaps && (
            <div className="flex space-x-1 border-r border-theme-border pr-2 mr-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={pastHistoryLength === 0}
                className={iconBtn}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <Undo2 className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={futureHistoryLength === 0}
                className={iconBtn}
                title="Redo (Ctrl+Y)"
                aria-label="Redo"
              >
                <Redo2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {canEditMaps && mode === "view" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode("draw");
                  setActivePlotId(null);
                }}
                className={`${toolBtn} bg-theme-accent text-theme-accent-fg hover:opacity-90`}
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Draw Area
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("slice");
                  setActivePlotId(null);
                  setSlicePoints([]);
                }}
                className={`${toolBtn} bg-theme-surface text-theme-text border border-theme-border hover:bg-theme-card`}
              >
                <Scissors className="w-3.5 h-3.5" aria-hidden="true" /> Slice
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("bulk");
                  setActivePlotId(null);
                  setSelectedPlotIds([]);
                }}
                className={`${toolBtn} bg-theme-surface text-theme-text border border-theme-border hover:bg-theme-card`}
              >
                <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" /> Bulk Action
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("editLabels");
                  setActivePlotId(null);
                }}
                className={`${toolBtn} bg-theme-success text-white hover:opacity-90`}
                title="Drag to adjust plot label offset"
              >
                <Move className="w-3.5 h-3.5" aria-hidden="true" /> Move Labels
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                aria-label="Editor settings"
                aria-pressed={showSettings}
                className={`${iconBtn} border ${
                  showSettings
                    ? "bg-theme-accent-muted border-theme-accent"
                    : "bg-theme-card border-theme-border"
                }`}
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </button>
            </>
          )}

          {canEditMaps && mode === "draw" && (
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setDrawingPoints([]);
                  setMode("view");
                }}
                className={`${toolBtn} bg-theme-surface text-theme-text border border-theme-border hover:bg-theme-card`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinishDrawing}
                className={`${toolBtn} bg-theme-success text-white hover:opacity-90`}
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Finish Shape
              </button>
            </div>
          )}

          {canEditMaps && mode === "slice" && (
            <button
              type="button"
              onClick={() => {
                setMode("view");
                setActivePlotId(null);
                setSlicePoints([]);
              }}
              className={`${toolBtn} bg-theme-surface text-theme-text border border-theme-border hover:bg-theme-card`}
            >
              Cancel Slice
            </button>
          )}

          {canEditMaps && mode === "calibrate" && (
            <button
              type="button"
              onClick={() => {
                setMode("view");
                setCalibrationPoints([]);
              }}
              className={`${toolBtn} bg-theme-surface text-theme-text border border-theme-border hover:bg-theme-card`}
            >
              Cancel Calibration
            </button>
          )}

          {canEditMaps && mode === "editLabels" && (
            <button
              type="button"
              onClick={() => {
                setMode("view");
              }}
              className={`${toolBtn} bg-theme-success text-white hover:opacity-90`}
            >
              Done Moving Labels
            </button>
          )}

          {canEditMaps && mode === "editShape" && (
            <div className="flex items-center space-x-2">
              <div className="flex border rounded-theme overflow-hidden bg-theme-card border-theme-border min-h-11 text-xs">
                <button
                  type="button"
                  onClick={() => setEditSubMode("vertices")}
                  className={`px-3 min-h-11 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                    editSubMode === "vertices"
                      ? "bg-theme-accent text-theme-accent-fg"
                      : "text-theme-text hover:bg-theme-surface"
                  }`}
                >
                  Edit Corners
                </button>
                <button
                  type="button"
                  onClick={() => setEditSubMode("transform")}
                  className={`px-3 min-h-11 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                    editSubMode === "transform"
                      ? "bg-theme-accent text-theme-accent-fg"
                      : "text-theme-text hover:bg-theme-surface"
                  }`}
                >
                  Scale/Rotate
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode("view");
                  setActivePlotId(null);
                }}
                className={`${toolBtn} bg-theme-accent text-theme-accent-fg hover:opacity-90`}
              >
                Done Shape
              </button>
            </div>
          )}

          {canEditMaps && mode === "bulk" && (
            <div className="flex flex-wrap items-center gap-1.5 bg-theme-accent-muted/40 p-1.5 rounded-theme border border-theme-border shrink-0 text-xs max-w-full">
              <span className="font-medium text-theme-accent px-1 whitespace-nowrap">
                {selectedPlotIds.length} Selected
              </span>

              <button
                type="button"
                onClick={handleSelectAll}
                className={`${toolBtn} bg-theme-accent text-theme-accent-fg hover:opacity-90 !min-h-11`}
              >
                {project.plots.every((p) => selectedPlotIds.includes(p.id)) &&
                selectedPlotIds.length > 0
                  ? "Deselect All"
                  : "Select All"}
              </button>

              <button
                type="button"
                onClick={() => setFreeSelectActive(!freeSelectActive)}
                className={`${toolBtn} border border-solid ${
                  freeSelectActive
                    ? "bg-theme-success text-white border-theme-success"
                    : "bg-theme-card text-theme-text border-theme-border hover:bg-theme-surface"
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
                aria-label="Bulk status"
                className="p-2 rounded-theme border border-theme-border bg-theme-card text-theme-text min-h-11 cursor-pointer text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              >
                <option value="">Status...</option>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
                <option value="road">Road</option>
                <option value="market">Market</option>
                <option value="park">Park</option>
              </select>

              <div className="flex items-center border rounded-theme overflow-hidden bg-theme-card border-theme-border min-h-11 text-xs">
                <input
                  type="number"
                  placeholder="Rate"
                  value={bulkRate}
                  onChange={(e) => setBulkRate(e.target.value)}
                  aria-label="Bulk rate"
                  className="w-14 p-2 bg-transparent text-theme-text outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const numericRate = parseFloat(bulkRate);
                    if (isNaN(numericRate)) {
                      toast("Please enter a valid rate", "warning");
                      return;
                    }
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
                  className="px-2 min-h-11 hover:bg-theme-surface text-theme-accent font-bold border-l border-theme-border cursor-pointer bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                >
                  Apply
                </button>
              </div>

              <button
                type="button"
                onClick={handleMergePlots}
                disabled={selectedPlotIds.length < 2}
                className={`${toolBtn} bg-theme-accent text-theme-accent-fg disabled:opacity-40`}
              >
                Merge
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                className={`${iconBtn} bg-theme-danger text-white hover:opacity-90`}
                disabled={selectedPlotIds.length === 0}
                aria-label="Delete selected plots"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
