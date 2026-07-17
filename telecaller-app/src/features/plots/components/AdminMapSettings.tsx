import { Settings, X, Layers, Eye, EyeOff, Lock, Unlock, Ruler, Upload } from "lucide-react";
import { Project } from "@/shared/types";

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
  if (!showSettings) return null;

  return (
    <div className="absolute top-16 right-4 md:right-8 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded-lg p-4 z-20 w-72 space-y-4 animate-fadeIn text-sm max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center border-b dark:border-gray-700 pb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
          <Settings className="w-4 h-4 mr-1.5 text-indigo-500" /> Editor Settings
        </h3>
        <button
          onClick={() => setShowSettings(false)}
          className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          JSON Database Operations
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <button
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
            className="flex items-center justify-center py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs font-semibold cursor-pointer"
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
                  alert(`Successfully imported ${parsedPlots.length} plots!`);
                } catch (err: any) {
                  alert("Failed to import JSON: " + err.message);
                }
              };
              reader.readAsText(file);
              e.target.value = "";
            }}
          />
          <label
            htmlFor="import-json-file"
            className="flex items-center justify-center py-1.5 border border-indigo-500 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-55 dark:hover:bg-indigo-900/30 text-xs font-semibold cursor-pointer text-center"
          >
            Import JSON
          </label>
        </div>
      </div>

      <div className="space-y-2 border-t dark:border-gray-700 pt-3">
        <h4 className="font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Snapping & Alignment
        </h4>
        <div className="space-y-2.5">
          <label className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-700 text-indigo-605 focus:ring-indigo-505 h-4 w-4"
            />
            <span>
              Grid Snapping{" "}
              <span className="text-[10px] text-gray-400 dark:text-gray-550 block">
                Lock to 0.5% grid increments
              </span>
            </span>
          </label>
          <label className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={snapToGeometry}
              onChange={(e) => setSnapToGeometry(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-700 text-indigo-605 focus:ring-indigo-505 h-4 w-4"
            />
            <span>
              Plot Snapping{" "}
              <span className="text-[10px] text-gray-400 dark:text-gray-550 block">
                Snap to adjacent corners and edges
              </span>
            </span>
          </label>
          {snapToGeometry && (
            <div className="pl-6 space-y-1">
              <div className="flex justify-between text-xs text-gray-650 dark:text-gray-400">
                <span>Snap Tolerance:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{snapTolerancePx} px</span>
              </div>
              <input
                type="range"
                min="2"
                max="25"
                step="1"
                value={snapTolerancePx}
                onChange={(e) => setSnapTolerancePx(parseInt(e.target.value))}
                className="w-full accent-indigo-650 h-1"
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t dark:border-gray-700 pt-3">
        <h4 className="font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
          <Layers className="w-3.5 h-3.5 mr-1" /> Map Layers
        </h4>
        <div className="space-y-2">
          {Object.entries(layers).map(([layerKey, layerVal]) => (
            <div
              key={layerKey}
              className="flex items-center justify-between text-gray-700 dark:text-gray-300 capitalize text-xs"
            >
              <span className="font-medium">{layerKey}</span>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    setLayers({
                      ...layers,
                      [layerKey]: {
                        ...layerVal,
                        visible: !layerVal.visible,
                      },
                    })
                  }
                  className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                    layerVal.visible ? "text-indigo-600" : "text-gray-400"
                  }`}
                >
                  {layerVal.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                {layerKey !== "labels" ? (
                  <button
                    onClick={() =>
                      setLayers({
                        ...layers,
                        [layerKey]: {
                          ...layerVal,
                          locked: !layerVal.locked,
                        },
                      })
                    }
                    className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                      layerVal.locked ? "text-red-500" : "text-gray-400"
                    }`}
                  >
                    {layerVal.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                ) : (
                  <div className="w-[22px]" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t dark:border-gray-700 pt-3">
        <h4 className="font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
          <Ruler className="w-3.5 h-3.5 mr-1" /> Scale Ruler
        </h4>
        <button
          onClick={() => {
            setMode("calibrate");
            setCalibrationPoints([]);
            setShowSettings(false);
          }}
          className="w-full flex items-center justify-center py-1.5 border border-indigo-550 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-xs font-semibold cursor-pointer"
        >
          Calibrate Map Ruler
        </button>
      </div>

      <div className="space-y-3 border-t dark:border-gray-700 pt-3">
        <h4 className="font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
          <Upload className="w-3.5 h-3.5 mr-1" /> Layout Image
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
          className="w-full flex items-center justify-center py-1.5 border border-indigo-550 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-xs font-semibold cursor-pointer text-center"
        >
          {uploadingImage ? "Uploading..." : "Upload New Image"}
        </label>
      </div>
    </div>
  );
}
