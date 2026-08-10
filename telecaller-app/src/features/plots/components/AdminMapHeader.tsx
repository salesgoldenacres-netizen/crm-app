import { useEffect, useRef, useState, type ReactNode } from "react";
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
  Route,
  ListOrdered,
  Focus,
  MoreHorizontal,
  HelpCircle,
} from "lucide-react";
import { Project } from "@/shared/types";
import { useToast } from "@/shared/components/Toast";
import Button from "@/shared/components/ui/Button";
import Dialog from "@/shared/components/ui/Dialog";

const iconBtn =
  "min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme " +
  "text-theme-muted hover:text-theme-text hover:bg-theme-surface transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring " +
  "disabled:opacity-30 disabled:pointer-events-none";

interface AdminMapHeaderProps {
  project: Project;
  projectId: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearchFocus: (number: string) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  resetMapTransform: () => void;
  pastHistoryLength: number;
  futureHistoryLength: number;
  mode: string;
  setMode: (mode: string) => void;
  setActivePlotId: (id: string | null) => void;
  setSelectedPlotIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setSlicePoints: (pts: [number, number][]) => void;
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
  setCalibrationPoints: (pts: [number, number][]) => void;
  setRoadCutPoints?: (pts: [number, number][]) => void;
  handleFinishRoadCut?: () => void;
  handleBatchRenumber?: () => void;
  pushToHistory: () => void;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  /** Wave 10: when false, hide edit tools and show touch gate banner. */
  canEditMaps?: boolean;
}

function ToolLabel({ children }: { children: ReactNode }) {
  return <span className="hidden sm:inline">{children}</span>;
}

export default function AdminMapHeader({
  project,
  projectId,
  searchQuery,
  setSearchQuery,
  handleSearchFocus,
  handleUndo,
  handleRedo,
  resetMapTransform,
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
  setRoadCutPoints,
  handleFinishRoadCut,
  handleBatchRenumber,
  pushToHistory,
  updateProject,
  canEditMaps = true,
}: AdminMapHeaderProps) {
  const { toast } = useToast();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const showViewTools = canEditMaps && mode === "view";
  const showModeChrome =
    canEditMaps &&
    (mode === "draw" ||
      mode === "slice" ||
      mode === "roadCut" ||
      mode === "calibrate" ||
      mode === "editLabels" ||
      mode === "editShape" ||
      mode === "bulk");

  useEffect(() => {
    if (!moreOpen || !showViewTools) return;

    function handlePointerOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMoreOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moreOpen, showViewTools]);

  const enterMode = (next: string) => {
    setMode(next);
    setActivePlotId(null);
    setMoreOpen(false);
  };

  return (
    <header className="bg-theme-card border-b border-theme-border z-10 transition-colors duration-300 header-brand-strip shrink-0">
      {!canEditMaps && (
        <div
          role="status"
          className="px-3 md:px-5 py-2 bg-theme-accent-muted border-b border-theme-border flex items-center gap-2 text-xs sm:text-sm text-theme-text"
        >
          <Monitor className="w-4 h-4 text-theme-accent flex-shrink-0" aria-hidden="true" />
          <span>
            Use a larger screen to edit maps. You can still view, pan, and zoom on this
            device.
          </span>
        </div>
      )}

      <div className="px-3 md:px-5 py-2.5 space-y-2 min-w-0">
        {/* Row 1 — identity + utilities (matches PageHeader / DashboardHeader chrome) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-h-11 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link to="/admin" aria-label="Back to Admin" className={iconBtn + " -ml-1.5"}>
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </Link>
            <h1 className="type-page-title text-sm sm:text-base tracking-tight text-theme-text truncate min-w-0">
              Edit Map: {project.name}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap sm:justify-end min-w-0">
            <div className="relative flex items-center flex-1 sm:flex-none min-w-0 bg-theme-surface rounded-theme px-2.5 min-h-11 border border-theme-border">
              <Search className="w-3.5 h-3.5 text-theme-muted mr-1.5 shrink-0" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search plot..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearchFocus(e.target.value);
                }}
                aria-label="Search plot"
                className="bg-transparent border-none outline-none text-xs text-theme-text w-full sm:w-28 md:w-36 focus-visible:ring-0 min-w-0"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className={iconBtn + " !min-h-8 !min-w-8 shrink-0"}
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </div>

            <div
              className="flex items-center gap-0.5 border border-theme-border rounded-theme bg-theme-card p-0.5"
              role="group"
              aria-label="History and view"
            >
              {canEditMaps && (
                <>
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
                </>
              )}
              <button
                type="button"
                onClick={resetMapTransform}
                className={iconBtn}
                title="Reset view (Ctrl+0)"
                aria-label="Reset view"
              >
                <Focus className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setShortcutsOpen(true)}
                className={iconBtn}
                title="Keyboard Shortcuts"
                aria-label="Keyboard Shortcuts"
              >
                <HelpCircle className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2 — editing tools wrap (no primary horizontal scrollbar) */}
        {showViewTools && (
          <div
            className="flex flex-wrap items-center gap-1.5 min-w-0"
            role="toolbar"
            aria-label="Map editing tools"
          >
            <Button
              size="sm"
              variant="primary"
              onClick={() => enterMode("draw")}
              aria-label="Draw Area"
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Draw</span>
              <ToolLabel>Area</ToolLabel>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                enterMode("slice");
                setSlicePoints([]);
              }}
              aria-label="Slice"
              className="gap-1.5"
            >
              <Scissors className="w-3.5 h-3.5" aria-hidden="true" />
              Slice
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                enterMode("roadCut");
                setRoadCutPoints?.([]);
              }}
              aria-label="Road Cut"
              className="gap-1.5"
            >
              <Route className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Road</span>
              <ToolLabel>Cut</ToolLabel>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                enterMode("bulk");
                setSelectedPlotIds([]);
              }}
              aria-label="Bulk Action"
              className="gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
              Bulk
            </Button>

            {/* Secondary tools: inline from md+, overflow menu below md */}
            <div className="hidden md:contents">
              {handleBatchRenumber && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBatchRenumber}
                  title="Renumber all plots W→E then N→S"
                  aria-label="Renumber plots"
                  className="gap-1.5"
                >
                  <ListOrdered className="w-3.5 h-3.5" aria-hidden="true" />
                  Renumber
                </Button>
              )}
              <Button
                size="sm"
                variant="success"
                onClick={() => enterMode("editLabels")}
                title="Drag to adjust plot label offset"
                aria-label="Move Labels"
                className="gap-1.5"
              >
                <Move className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Move</span>
                <ToolLabel>Labels</ToolLabel>
              </Button>
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                aria-label="Editor settings"
                aria-pressed={showSettings}
                className={`${iconBtn} border ${
                  showSettings
                    ? "bg-theme-accent-muted border-theme-accent text-theme-accent"
                    : "bg-theme-card border-theme-border"
                }`}
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="relative md:hidden" ref={moreRef}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMoreOpen((open) => !open)}
                aria-label="More map tools"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                className="gap-1.5"
              >
                <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                More
              </Button>
              {moreOpen && (
                <div
                  role="menu"
                  aria-label="More map tools"
                  className="absolute right-0 mt-2 w-48 bg-theme-card rounded-theme shadow-elevation-md border border-theme-border z-50 py-1 text-xs font-semibold text-theme-text"
                >
                  {handleBatchRenumber && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        handleBatchRenumber();
                        setMoreOpen(false);
                      }}
                      className="w-full min-h-11 px-3 flex items-center gap-2 text-left hover:bg-theme-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                    >
                      <ListOrdered className="w-3.5 h-3.5 text-theme-muted" aria-hidden="true" />
                      Renumber
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => enterMode("editLabels")}
                    className="w-full min-h-11 px-3 flex items-center gap-2 text-left hover:bg-theme-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                  >
                    <Move className="w-3.5 h-3.5 text-theme-muted" aria-hidden="true" />
                    Move Labels
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowSettings(!showSettings);
                      setMoreOpen(false);
                    }}
                    className="w-full min-h-11 px-3 flex items-center gap-2 text-left hover:bg-theme-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                  >
                    <Settings className="w-3.5 h-3.5 text-theme-muted" aria-hidden="true" />
                    Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {showModeChrome && (
          <div
            className="flex flex-wrap items-center gap-1.5 min-w-0"
            role="toolbar"
            aria-label="Active map tool actions"
          >
            {mode === "draw" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDrawingPoints([]);
                    setMode("view");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="success"
                  onClick={handleFinishDrawing}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Finish Shape
                </Button>
              </>
            )}

            {mode === "slice" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMode("view");
                  setActivePlotId(null);
                  setSlicePoints([]);
                }}
              >
                Cancel Slice
              </Button>
            )}

            {mode === "roadCut" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMode("view");
                    setRoadCutPoints?.([]);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" variant="success" onClick={() => handleFinishRoadCut?.()}>
                  Finish Road Cut
                </Button>
              </>
            )}

            {mode === "calibrate" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMode("view");
                  setCalibrationPoints([]);
                }}
              >
                Cancel Calibration
              </Button>
            )}

            {mode === "editLabels" && (
              <Button size="sm" variant="success" onClick={() => setMode("view")}>
                Done Moving Labels
              </Button>
            )}

            {mode === "editShape" && (
              <>
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
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setMode("view");
                    setActivePlotId(null);
                  }}
                >
                  Done Shape
                </Button>
              </>
            )}

            {mode === "bulk" && (
              <div className="flex flex-wrap items-center gap-1.5 bg-theme-accent-muted/40 p-1.5 rounded-theme border border-theme-border w-full max-w-full text-xs">
                <span className="font-medium text-theme-accent px-1 whitespace-nowrap">
                  {selectedPlotIds.length} Selected
                </span>

                <Button size="sm" variant="primary" onClick={handleSelectAll}>
                  {project.plots.every((p) => selectedPlotIds.includes(p.id)) &&
                  selectedPlotIds.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </Button>

                <Button
                  size="sm"
                  variant={freeSelectActive ? "success" : "outline"}
                  onClick={() => setFreeSelectActive(!freeSelectActive)}
                >
                  {freeSelectActive ? "Drag Selecting" : "Free Select"}
                </Button>

                <select
                  value={bulkStatus}
                  onChange={(e) => {
                    setBulkStatus(e.target.value);
                    if (e.target.value) {
                      pushToHistory();
                      const updated = project.plots.map((p) =>
                        selectedPlotIds.includes(p.id)
                          ? { ...p, status: e.target.value }
                          : p
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

                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleMergePlots}
                  disabled={selectedPlotIds.length < 2}
                >
                  Merge
                </Button>

                {handleBatchRenumber && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBatchRenumber}
                    disabled={selectedPlotIds.length === 0}
                    title="Renumber selection W→E then N→S"
                    className="gap-1.5"
                  >
                    <ListOrdered className="w-3.5 h-3.5" aria-hidden="true" />
                    Renumber
                  </Button>
                )}

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
        )}
      </div>

      <Dialog
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        title="Admin Map Editor — Keyboard Shortcuts"
        cancelLabel="Close"
        description="Active keyboard shortcuts supported during map editing:"
      >
        <div className="mt-3 space-y-2 text-xs text-theme-text">
          <div className="flex items-center justify-between border-b border-theme-border pb-1.5">
            <span className="font-semibold">Cancel Action / Deselect</span>
            <kbd className="px-2 py-0.5 bg-theme-surface border border-theme-border rounded text-[11px] font-mono">ESC</kbd>
          </div>
          <div className="flex items-center justify-between border-b border-theme-border pb-1.5">
            <span className="font-semibold">Undo Action</span>
            <kbd className="px-2 py-0.5 bg-theme-surface border border-theme-border rounded text-[11px] font-mono">Ctrl + Z</kbd>
          </div>
          <div className="flex items-center justify-between border-b border-theme-border pb-1.5">
            <span className="font-semibold">Redo Action</span>
            <kbd className="px-2 py-0.5 bg-theme-surface border border-theme-border rounded text-[11px] font-mono">Ctrl + Y</kbd>
          </div>
          <div className="flex items-center justify-between border-b border-theme-border pb-1.5">
            <span className="font-semibold">Delete Selected Plot(s)</span>
            <kbd className="px-2 py-0.5 bg-theme-surface border border-theme-border rounded text-[11px] font-mono">Delete / Backspace</kbd>
          </div>
          <div className="flex items-center justify-between pb-1">
            <span className="font-semibold">Reset View Zoom/Pan</span>
            <kbd className="px-2 py-0.5 bg-theme-surface border border-theme-border rounded text-[11px] font-mono">Ctrl + 0</kbd>
          </div>
        </div>
      </Dialog>
    </header>
  );
}
