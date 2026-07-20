import { Settings, X, Layers, Eye, EyeOff, Lock, Unlock, Ruler, Upload } from "lucide-react";
import { Project } from "@/shared/types";
import { useToast } from "@/shared/components/Toast";

interface AdminMapSettingsProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  project: Project;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  projectId: string;
  pushToHistory: () => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  snapToGeometry: boolean;
  setSnapToGeometry: (snap: boolean) => void;
  snapTolerancePx: number;
  setSnapTolerancePx: (tolerance: number) => void;
  layers: Record<string, any>;
  setLayers: (layers: Record<string, any>) => void;
  setMode: (mode: string) => void;
  setCalibrationPoints: (points: any[]) => void;
  handleMapEditorImageUpload: (e: any) => void;
  uploadingImage: boolean;
}

const settingsBtn =
  "flex items-center justify-center min-h-11 py-2 px-2 rounded-theme text-xs font-semibold cursor-pointer " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

const checkboxClass =
  "rounded border-theme-border text-theme-accent focus:ring-theme-ring h-4 w-4";

export default function AdminMapSettings({
  showSettings,
  setShowSettings,
  project,
  updateProject,
  projectId,
  pushToHistory,
  snapToGrid,
  setSnapToGrid,
  snapToGeometry,
  setSnapToGeometry,
  snapTolerancePx,
  setSnapTolerancePx,
  layers,
  setLayers,
  setMode,
  setCalibrationPoints,
  handleMapEditorImageUpload,
  uploadingImage,
}: AdminMapSettingsProps) {
  const { toast } = useToast();
  if (!showSettings) return null;

  return (
    <div className="absolute top-16 right-4 md:right-8 bg-theme-card shadow-xl border border-theme-border rounded-theme p-4 z-20 w-72 space-y-4 animate-fadeIn text-sm max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center border-b border-theme-border pb-2">
        <h3 className="font-semibold text-theme-text flex items-center">
          <Settings className="w-4 h-4 mr-1.5 text-theme-accent" aria-hidden="true" />{" "}
          Editor Settings
        </h3>
        <button
          type="button"
          onClick={() => setShowSettings(false)}
          aria-label="Close settings"
          className={
            "min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme text-theme-muted " +
            "hover:text-theme-text hover:bg-theme-surface transition-colors " +
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
          }
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider">
          JSON Database Operations
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              const dataStr = JSON.stringify(project.plots, null, 2);
              const dataBlob = new Blob([dataStr], { type: "application/json" });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${project.id}-plots-backup.json`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            className={`${settingsBtn} bg-theme-accent text-theme-accent-fg hover:opacity-90`}
          >
            Export JSON
          </button>

          <input
            type="file"
            id="import-json-file"
            accept=".json"
            className="hidden"
            onChange={(e: any) => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (event: any) => {
                try {
                  const parsedPlots = JSON.parse(event.target.result);
                  if (!Array.isArray(parsedPlots)) {
                    throw new Error("Plots database should be a JSON array.");
                  }
                  parsedPlots.forEach((p, idx) => {
                    if (!p.id || !p.points) {
                      throw new Error(`Item at index ${idx} is missing id or points.`);
                    }
                  });
                  pushToHistory();
                  updateProject(projectId, { ...project, plots: parsedPlots });
                  toast(
                    `Successfully imported ${parsedPlots.length} plots!`,
                    "success"
                  );
                } catch (err: any) {
                  toast("Failed to import JSON: " + err.message, "error");
                }
              };
              reader.readAsText(file);
              e.target.value = "";
            }}
          />
          <label
            htmlFor="import-json-file"
            className={`${settingsBtn} border border-theme-accent text-theme-accent hover:bg-theme-accent-muted text-center`}
          >
            Import JSON
          </label>
        </div>
      </div>

      <div className="space-y-2 border-t border-theme-border pt-3">
        <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider">
          Snapping & Alignment
        </h4>
        <div className="space-y-2.5">
          <label className="flex items-center space-x-2 text-theme-text cursor-pointer min-h-11">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
              className={checkboxClass}
            />
            <span>
              Grid Snapping{" "}
              <span className="text-[10px] text-theme-muted block">
                Lock to 0.5% grid increments
              </span>
            </span>
          </label>
          <label className="flex items-center space-x-2 text-theme-text cursor-pointer min-h-11">
            <input
              type="checkbox"
              checked={snapToGeometry}
              onChange={(e) => setSnapToGeometry(e.target.checked)}
              className={checkboxClass}
            />
            <span>
              Plot Snapping{" "}
              <span className="text-[10px] text-theme-muted block">
                Snap to adjacent corners and edges
              </span>
            </span>
          </label>
          {snapToGeometry && (
            <div className="pl-6 space-y-1">
              <div className="flex justify-between text-xs text-theme-muted">
                <span>Snap Tolerance:</span>
                <span className="font-bold text-theme-accent">{snapTolerancePx} px</span>
              </div>
              <input
                type="range"
                min="2"
                max="25"
                step="1"
                value={snapTolerancePx}
                onChange={(e) => setSnapTolerancePx(parseInt(e.target.value))}
                aria-label="Snap tolerance in pixels"
                className="w-full accent-[var(--theme-accent)] min-h-11"
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-theme-border pt-3">
        <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider flex items-center">
          <Layers className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Map Layers
        </h4>
        <div className="space-y-2">
          {Object.entries(layers).map(([layerKey, layerVal]) => (
            <div
              key={layerKey}
              className="flex items-center justify-between text-theme-text capitalize text-xs"
            >
              <span className="font-medium">{layerKey}</span>
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() =>
                    setLayers({
                      ...layers,
                      [layerKey]: {
                        ...layerVal,
                        visible: !layerVal.visible,
                      },
                    })
                  }
                  aria-label={`${layerVal.visible ? "Hide" : "Show"} ${layerKey} layer`}
                  className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme hover:bg-theme-surface cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                    layerVal.visible ? "text-theme-accent" : "text-theme-muted"
                  }`}
                >
                  {layerVal.visible ? (
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
                {layerKey !== "labels" ? (
                  <button
                    type="button"
                    onClick={() =>
                      setLayers({
                        ...layers,
                        [layerKey]: {
                          ...layerVal,
                          locked: !layerVal.locked,
                        },
                      })
                    }
                    aria-label={`${layerVal.locked ? "Unlock" : "Lock"} ${layerKey} layer`}
                    className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme hover:bg-theme-surface cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                      layerVal.locked ? "text-theme-danger" : "text-theme-muted"
                    }`}
                  >
                    {layerVal.locked ? (
                      <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  <div className="w-11" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-theme-border pt-3">
        <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider flex items-center">
          <Ruler className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Scale Ruler
        </h4>
        <button
          type="button"
          onClick={() => {
            setMode("calibrate");
            setCalibrationPoints([]);
            setShowSettings(false);
          }}
          className={`${settingsBtn} w-full border border-theme-accent text-theme-accent hover:bg-theme-accent-muted`}
        >
          Calibrate Map Ruler
        </button>
      </div>

      <div className="space-y-3 border-t border-theme-border pt-3">
        <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider flex items-center">
          <Upload className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Layout Image
        </h4>
        <input
          type="file"
          id="layout-image-upload"
          accept="image/*"
          className="hidden"
          onChange={handleMapEditorImageUpload}
          disabled={uploadingImage}
        />
        <label
          htmlFor="layout-image-upload"
          className={`${settingsBtn} w-full border border-theme-accent text-theme-accent hover:bg-theme-accent-muted text-center ${
            uploadingImage ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {uploadingImage ? "Uploading..." : "Upload New Image"}
        </label>
      </div>
    </div>
  );
}
